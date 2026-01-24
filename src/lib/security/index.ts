/**
 * 安全模块索引
 * 统一导出所有安全相关功能
 */

// 工作量证明
export {
  solveChallenge,
  createPoWWorker,
  generateChallenge,
  verifyProof,
  useProofOfWork,
  type PoWChallenge,
  type PoWSolution,
  type PoWVerificationResult,
} from "./proofOfWork";

// PoW 令牌存储
export {
  validatePoWToken,
  consumePoWToken,
  storePoWToken,
  getTokenTTL,
} from "./powTokenStore";

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
