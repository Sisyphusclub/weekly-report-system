import ExcelJS from "exceljs";

// This process receives file bytes only. It does not receive application secrets.
process.once("message", async (bytes) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("NO_SHEET");
    if (sheet.columnCount > 32) throw new Error("TOO_MANY_COLUMNS");
    const headers = sheet.getRow(1).values.slice(1).map(String);
    const rows = [];
    sheet.eachRow((row, index) => {
      if (index <= 1) return;
      if (rows.length >= 200) throw new Error("TOO_MANY_ROWS");
      const values = row.values.slice(1);
      rows.push(
        Object.fromEntries(
          headers.map((header, i) => [header, values[i] ?? null]),
        ),
      );
    });
    process.send({ rows });
  } catch (error) {
    const known = ["NO_SHEET", "TOO_MANY_COLUMNS", "TOO_MANY_ROWS"];
    process.send({
      error: known.includes(error.message) ? error.message : "INVALID_FILE",
    });
  }
});
