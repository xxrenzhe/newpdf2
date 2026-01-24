/**
 * 文件类型验证模块
 * 使用魔数 (magic bytes) 验证文件真实类型，防止文件类型伪造攻击
 * 借鉴 qwerpdf.com 的多层文件验证机制
 */

// ============================================================================
// 文件签名定义
// ============================================================================

interface FileSignature {
  magic: number[];
  offset?: number;
  mask?: number[]; // 用于部分匹配
}

const FILE_SIGNATURES: Record<string, FileSignature[]> = {
  // PDF
  "application/pdf": [{ magic: [0x25, 0x50, 0x44, 0x46] }], // %PDF

  // 图片格式
  "image/png": [{ magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/jpeg": [{ magic: [0xff, 0xd8, 0xff] }],
  "image/gif": [
    { magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [
    {
      magic: [0x52, 0x49, 0x46, 0x46], // RIFF
      offset: 0,
    },
  ],
  "image/bmp": [{ magic: [0x42, 0x4d] }], // BM
  "image/tiff": [
    { magic: [0x49, 0x49, 0x2a, 0x00] }, // Little endian
    { magic: [0x4d, 0x4d, 0x00, 0x2a] }, // Big endian
  ],

  // 压缩格式 (Office 文档基于 ZIP)
  "application/zip": [{ magic: [0x50, 0x4b, 0x03, 0x04] }],
  "application/x-rar-compressed": [{ magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] }],
  "application/gzip": [{ magic: [0x1f, 0x8b] }],
  "application/x-7z-compressed": [{ magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] }],

  // Office 文档 (OOXML - 基于 ZIP)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { magic: [0x50, 0x4b, 0x03, 0x04] },
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { magic: [0x50, 0x4b, 0x03, 0x04] },
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    { magic: [0x50, 0x4b, 0x03, 0x04] },
  ],

  // 旧版 Office 文档 (OLE)
  "application/msword": [{ magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  "application/vnd.ms-excel": [{ magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  "application/vnd.ms-powerpoint": [{ magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],

  // 纯文本 (无魔数，需要特殊处理)
  "text/plain": [],
};

// MIME 类型别名映射
const MIME_ALIASES: Record<string, string> = {
  "application/x-zip-compressed": "application/zip",
  "application/octet-stream": "", // 通用二进制，不做魔数验证
};

// ============================================================================
// 类型定义
// ============================================================================

export interface FileValidationResult {
  valid: boolean;
  detectedType: string | null;
  declaredType: string;
  error?: string;
}

export interface PdfValidationResult {
  valid: boolean;
  version?: string;
  encrypted?: boolean;
  error?: string;
}

// ============================================================================
// 核心验证函数
// ============================================================================

/**
 * 检测文件的真实 MIME 类型
 * @param file - 要检测的文件
 * @returns 检测到的 MIME 类型或 null
 */
export async function detectFileType(file: File): Promise<string | null> {
  const header = await file.slice(0, 32).arrayBuffer();
  const bytes = new Uint8Array(header);

  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    if (signatures.length === 0) continue; // 跳过没有魔数的类型

    for (const sig of signatures) {
      const offset = sig.offset || 0;
      if (offset + sig.magic.length > bytes.length) continue;

      const match = sig.magic.every((byte, i) => {
        if (sig.mask) {
          return (bytes[offset + i]! & sig.mask[i]!) === (byte & sig.mask[i]!);
        }
        return bytes[offset + i] === byte;
      });

      if (match) {
        return mimeType;
      }
    }
  }

  return null;
}

/**
 * 验证文件类型是否与声明的类型匹配
 * @param file - 要验证的文件
 * @returns 验证结果
 */
export async function validateFileType(file: File): Promise<FileValidationResult> {
  const declaredType = MIME_ALIASES[file.type] ?? file.type;

  // 通用二进制类型跳过验证
  if (declaredType === "") {
    return { valid: true, detectedType: null, declaredType: file.type };
  }

  const detectedType = await detectFileType(file);

  // 纯文本文件没有魔数，使用启发式检测
  if (
    declaredType === "text/plain" ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".csv")
  ) {
    const isText = await isPlainText(file);
    return {
      valid: isText,
      detectedType: isText ? "text/plain" : detectedType,
      declaredType,
      error: isText ? undefined : "File contains binary data",
    };
  }

  // Office 文档特殊处理 (都是 ZIP 格式)
  if (declaredType.includes("officedocument") || declaredType.includes("msword")) {
    const isZipBased =
      detectedType === "application/zip" ||
      detectedType?.includes("officedocument") ||
      detectedType?.startsWith("application/vnd.ms-");

    if (isZipBased) {
      // 进一步验证 ZIP 内容
      const isValidOffice = await validateOfficeDocument(file, declaredType);
      return {
        valid: isValidOffice,
        detectedType,
        declaredType,
        error: isValidOffice ? undefined : "Invalid Office document structure",
      };
    }
  }

  // 标准验证
  const valid = detectedType === declaredType;

  return {
    valid,
    detectedType,
    declaredType,
    error: valid ? undefined : `Type mismatch: expected ${declaredType}, got ${detectedType}`,
  };
}

/**
 * 检测文件是否为纯文本
 */
async function isPlainText(file: File): Promise<boolean> {
  const sample = await file.slice(0, 8192).arrayBuffer();
  const bytes = new Uint8Array(sample);

  // 检查是否包含非文本字节
  for (const byte of bytes) {
    // 允许的字符: 可打印 ASCII, 换行, 回车, 制表符
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte === 0x7f) {
      // 检查是否可能是 UTF-8 多字节序列
      if (byte < 0x80 || byte > 0xf4) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 验证 Office 文档结构
 */
async function validateOfficeDocument(file: File, declaredType: string): Promise<boolean> {
  try {
    // 读取 ZIP 中央目录，检查是否包含预期的文件
    const expectedFiles: Record<string, string[]> = {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        "word/document.xml",
        "[Content_Types].xml",
      ],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        "xl/workbook.xml",
        "[Content_Types].xml",
      ],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        "ppt/presentation.xml",
        "[Content_Types].xml",
      ],
    };

    const required = expectedFiles[declaredType];
    if (!required) return true; // 未知类型，跳过深度验证

    // 简单检查：读取文件开头，查找 ZIP 文件名记录
    const header = await file.slice(0, Math.min(file.size, 65536)).arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(header);

    // 检查是否包含预期的内部文件名
    return required.some((name) => text.includes(name));
  } catch {
    return false;
  }
}

// ============================================================================
// PDF 特定验证
// ============================================================================

/**
 * 深度验证 PDF 文件结构
 * @param file - PDF 文件
 * @returns 验证结果
 */
export async function validatePdfStructure(file: File): Promise<PdfValidationResult> {
  try {
    // 读取文件头部
    const headerBuffer = await file.slice(0, 1024).arrayBuffer();
    const headerText = new TextDecoder("utf-8", { fatal: false }).decode(headerBuffer);

    // 检查 PDF 头
    if (!headerText.startsWith("%PDF-")) {
      return { valid: false, error: "Invalid PDF header: missing %PDF- signature" };
    }

    // 提取版本号
    const versionMatch = headerText.match(/^%PDF-(\d+\.\d+)/);
    if (!versionMatch) {
      return { valid: false, error: "Invalid PDF version format" };
    }

    const version = versionMatch[1]!;
    const versionNum = parseFloat(version);

    // 验证版本范围 (PDF 1.0 - 2.0)
    if (versionNum < 1.0 || versionNum > 2.0) {
      return { valid: false, error: `Unsupported PDF version: ${version}` };
    }

    // 读取文件尾部检查 %%EOF
    const tailSize = Math.min(1024, file.size);
    const tailBuffer = await file.slice(file.size - tailSize).arrayBuffer();
    const tailText = new TextDecoder("utf-8", { fatal: false }).decode(tailBuffer);

    if (!tailText.includes("%%EOF")) {
      return { valid: false, error: "Invalid PDF: missing %%EOF marker" };
    }

    // 检查是否加密
    const encrypted = headerText.includes("/Encrypt") || tailText.includes("/Encrypt");

    return { valid: true, version, encrypted };
  } catch (error) {
    return {
      valid: false,
      error: `PDF validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================================================
// 文件大小验证
// ============================================================================

export interface FileSizeLimits {
  pdf: number;
  image: number;
  office: number;
  other: number;
}

const DEFAULT_SIZE_LIMITS: FileSizeLimits = {
  pdf: 100 * 1024 * 1024, // 100MB
  image: 20 * 1024 * 1024, // 20MB
  office: 25 * 1024 * 1024, // 25MB
  other: 10 * 1024 * 1024, // 10MB
};

/**
 * 根据文件类型获取大小限制
 */
export function getFileSizeLimit(mimeType: string, limits = DEFAULT_SIZE_LIMITS): number {
  if (mimeType === "application/pdf") return limits.pdf;
  if (mimeType.startsWith("image/")) return limits.image;
  if (mimeType.includes("office") || mimeType.includes("document")) return limits.office;
  return limits.other;
}

/**
 * 验证文件大小
 */
export function validateFileSize(
  file: File,
  limits = DEFAULT_SIZE_LIMITS
): { valid: boolean; error?: string } {
  const limit = getFileSizeLimit(file.type, limits);

  if (file.size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024));
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB exceeds ${limitMB}MB limit`,
    };
  }

  return { valid: true };
}

// ============================================================================
// 综合验证
// ============================================================================

export interface ComprehensiveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    declaredType: string;
    detectedType: string | null;
  };
}

/**
 * 对文件进行全面验证
 */
export async function validateFile(
  file: File,
  options: {
    sizeLimits?: FileSizeLimits;
  } = {}
): Promise<ComprehensiveValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 验证文件大小
  const sizeResult = validateFileSize(file, options.sizeLimits);
  if (!sizeResult.valid && sizeResult.error) {
    errors.push(sizeResult.error);
  }

  // 2. 验证文件类型
  const typeResult = await validateFileType(file);
  if (!typeResult.valid && typeResult.error) {
    errors.push(typeResult.error);
  }

  // 3. PDF 特定验证
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfResult = await validatePdfStructure(file);
    if (!pdfResult.valid && pdfResult.error) {
      errors.push(pdfResult.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      declaredType: file.type,
      detectedType: typeResult.detectedType,
    },
  };
}
