/**
 * 安全模块索引
 * 统一导出所有安全相关功能
 */

// 文件验证
export {
  detectFileType,
  validateFileType,
  validatePdfStructure,
  validateFileSize,
  getFileSizeLimit,
  validateFile,
  type FileValidationResult,
  type PdfValidationResult,
  type FileSizeLimits,
  type ComprehensiveValidationResult,
} from "./fileValidation";

// 反爬虫保护
export { preventIframeEmbedding, domainLock } from "./antiScraping";
