"use client";
import {useSearchParams} from "next/navigation";
export function CashNotice(){const params=useSearchParams(),error=params.get("error"),success=params.get("success");if(!error&&!success)return null;return <div className={`mb-4 rounded-lg border p-3 text-sm ${error?"border-red-200 bg-red-50 text-red-700":"border-green-200 bg-green-50 text-green-700"}`}>{error||success}</div>}
