import { NextResponse } from "next/server";

/**
 * 健康检查端点
 * 用于 Docker 容器和负载均衡器的健康检查
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
  };

  return NextResponse.json(health, { status: 200 });
}
