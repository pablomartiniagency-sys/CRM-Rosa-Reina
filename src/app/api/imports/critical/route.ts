import { NextResponse } from "next/server";
import readXlsxFile from "read-excel-file/node";
import { classifyCriticalRow } from "@/lib/crm/security";
import { createCriticalImportBatch, reviewCriticalImportBatch } from "@/lib/crm/data";
import type { Json } from "@/types/crm";

export const dynamic = "force-dynamic";

function rowsToObjects(rows: unknown[][]): Json[] {
  const [headers, ...values] = rows;
  if (!headers?.length) return [];
  const cleanHeaders = headers.map((header, index) => String(header || `col_${index + 1}`).trim());
  return values
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""))
    .map((row) =>
      cleanHeaders.reduce<Json>((acc, header, index) => {
        acc[header] = row[index] ?? "";
        return acc;
      }, {})
    );
}

function parseDelimited(text: string, separator: "," | "\t"): Json[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(separator).map((cell) => cell.trim()));
  return rowsToObjects(rows);
}

async function parseUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv")) return parseDelimited(buffer.toString("utf8"), ",");
  if (lowerName.endsWith(".tsv")) return parseDelimited(buffer.toString("utf8"), "\t");
  const rows = await readXlsxFile(buffer);
  return rowsToObjects(rows as unknown as unknown[][]);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data with a file field" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const rows = await parseUpload(file);
    const stagedRows = rows.slice(0, 500).map((row, index) => classifyCriticalRow(index + 1, row));
    const batch = await createCriticalImportBatch({
      fileName: file.name,
      fileType: file.type || null,
      uploadedBy: String(formData.get("uploadedBy") ?? "crm"),
      rows: stagedRows,
    });

    return NextResponse.json({ batch, rows: stagedRows, status: "staged" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Critical import failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      batchId?: unknown;
      action?: unknown;
      reviewedBy?: unknown;
    };

    if (typeof body.batchId !== "string" || !body.batchId.trim()) {
      return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
    }

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "Action must be approve or reject" }, { status: 400 });
    }

    const batch = await reviewCriticalImportBatch({
      batchId: body.batchId,
      action: body.action,
      reviewedBy: typeof body.reviewedBy === "string" && body.reviewedBy.trim() ? body.reviewedBy : "crm",
    });

    return NextResponse.json({ batch, status: batch.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Critical import review failed" },
      { status: 500 }
    );
  }
}
