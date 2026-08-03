const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageOrientation } = require("docx");

const AZUL = "1F4E79";
const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D1DA" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 40, bottom: 40, left: 60, right: 60 };

// 9 columns, landscape content width = 15840 - 2*1080 = 13680
const COLS = [1360, 1360, 1640, 1640, 1640, 1640, 1500, 1500, 1400];
const TBL_W = COLS.reduce((a, b) => a + b, 0);

function hCell(text, w) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    shading: { fill: "DBE5F1", type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: AZUL, size: 15 })] })],
  });
}
function dCell(text, w, opts = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER, rowSpan: opts.rowSpan,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, size: 15, bold: !!opts.bold })] })],
  });
}

const header = [
  "Fecha", "Hora", "Medidor ingreso UF", "Medidor salida UF TR",
  "Vol. ingreso UF (m³)", "Vol. salida UF TR (m³)",
  "Vol. ingreso UF (lps)", "Vol. salida UF TR (lps)", "Eficiencia UF (%)",
];

const rows = [
  ["6:00", "4947,77", "4529,16", "15,32", "12,43", "4,26", "3,45", "81,14"],
  ["7:00", "4963,09", "4541,59", "16,15", "14,17", "4,49", "3,94", "87,74"],
  ["8:00", "4979,24", "4555,76", "14,52", "10,59", "4,03", "2,94", "72,93"],
  ["9:00", "4993,76", "4566,35", "20,47", "18,98", "5,69", "5,27", "92,72"],
  ["10:00", "5014,23", "4585,33", "14,51", "13,06", "4,03", "3,63", "90,01"],
  ["11:00", "5028,74", "4598,39", "22,54", "21,66", "6,26", "6,02", "96,10"],
  ["12:00", "5051,28", "4620,05", "—", "—", "—", "—", "—"],
];

const tableRows = [];
tableRows.push(new TableRow({ tableHeader: true, children: header.map((h, i) => hCell(h, COLS[i])) }));
rows.forEach((r, idx) => {
  const cells = [];
  if (idx === 0) cells.push(dCell("17/06/2026", COLS[0], { rowSpan: 7, bold: true, fill: "FAFBFC" }));
  r.forEach((v, j) => cells.push(dCell(v, COLS[j + 1])));
  tableRows.push(new TableRow({ children: cells }));
});
// TOTAL row
tableRows.push(new TableRow({ children: [
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[0] + COLS[1], type: WidthType.DXA },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL (m³)", bold: true, size: 15 })] })] }),
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[2] + COLS[3], type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
  dCell("103,51", COLS[4], { bold: true, fill: "F5F6F8" }),
  dCell("90,89", COLS[5], { bold: true, fill: "F5F6F8" }),
  dCell("", COLS[6], { fill: "F5F6F8" }),
  dCell("", COLS[7], { fill: "F5F6F8" }),
  dCell("", COLS[8], { fill: "F5F6F8" }),
] }));
// PROMEDIO row
tableRows.push(new TableRow({ children: [
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[0] + COLS[1], type: WidthType.DXA },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PROMEDIO", bold: true, size: 15 })] })] }),
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[2] + COLS[3], type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
  dCell("17,25", COLS[4], { bold: true, fill: "F5F6F8" }),
  dCell("15,15", COLS[5], { bold: true, fill: "F5F6F8" }),
  dCell("4,79", COLS[6], { bold: true, fill: "F5F6F8" }),
  dCell("4,21", COLS[7], { bold: true, fill: "F5F6F8" }),
  dCell("86,77", COLS[8], { bold: true, fill: "F5F6F8" }),
] }));

const table = new Table({ width: { size: TBL_W, type: WidthType.DXA }, columnWidths: COLS, rows: tableRows });

function p(runs) { return new Paragraph({ spacing: { after: 160 }, alignment: AlignmentType.JUSTIFIED, children: runs }); }
function t(text, bold) { return new TextRun({ text, bold: !!bold, color: bold ? AZUL : undefined }); }
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 2 } },
    children: [new TextRun({ text, bold: true, color: AZUL, size: 24 })] });
}

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
  sections: [{
    properties: { page: {
      size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
      margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
    } },
    children: [
      new Paragraph({ spacing: { after: 40 },
        children: [new TextRun({ text: "SEGUIMIENTO PTAP HORA A HORA", bold: true, color: AZUL, size: 32 })] }),
      new Paragraph({ spacing: { after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 2 } },
        children: [new TextRun({ text: "Fecha de operación: 17 de junio de 2026  ·  Ventana monitoreada: 06:00 – 12:00", color: "5A6470", size: 18 })] }),

      p([t("El presente seguimiento se realiza con el fin de evaluar el desempeño hidráulico de la planta, cuyo objetivo de tratamiento es de "),
         t("10 lps", true), t(". Para alcanzarlo se requiere que ingresen como mínimo "), t("36 m³/h", true),
         t(" a la unidad de ultrafiltración (UF). El monitoreo hora a hora busca verificar el caudal real entregado por el pozo tras la modificación realizada a la bomba de extracción el fin de semana, y determinar hasta qué punto el tren de tratamiento permite sostener ese caudal de forma estable.")]),

      h2("Descripción del sistema"),
      p([t("El agua se extrae del pozo mediante una bomba de extracción —intervenida el fin de semana con el propósito de incrementar el caudal de envío— que descarga sobre una torre de aireación. Desde la torre el agua cae a una primera piscina, la cual rebosa hacia una segunda piscina que alimenta el clarifloculador; el control operativo busca precisamente evitar el rebose de esta segunda piscina, de manera que todo lo extraído del pozo ingrese al clarifloculador. A la salida del clarifloculador, antes de la UF, se encuentra un filtro bolsa que actúa como protección de las membranas. La UF opera por ciclos, alternando aproximadamente "),
         t("65 minutos de filtración", true), t(" con "), t("8 a 12 minutos de enjuague", true),
         t(". Es importante anotar que el agua filtrada no se dirige en su totalidad al tanque de recirculación: una fracción se desvía hacia una "),
         t("tercera piscina", true), t(", que es la que alimenta los enjuagues de la UF y que en esta jornada tardó cerca de "),
         t("13 minutos", true), t(" en llenarse.")]),

      h2("Registro de eficiencias UF (06:00 – 12:00)"),
      table,
      new Paragraph({ spacing: { before: 80, after: 160 },
        children: [new TextRun({ text: "Eficiencia promedio de la UF durante la ventana monitoreada: ", size: 17, color: "5A6470" }),
                   new TextRun({ text: "86,77 %.", size: 17, bold: true, color: AZUL })] }),

      h2("Desarrollo del seguimiento y ajustes realizados"),
      p([t("La jornada se trabajó subiendo de forma progresiva la frecuencia de la bomba de alimentación al clarifloculador desde los "),
         t("38 Hz", true), t(", acompañando cada incremento con los ajustes necesarios aguas abajo. El objetivo de elevar los Hz de alimentación era evitar que la segunda piscina —que es la que alimenta el clarifloculador— se rebosara, logrando que todo el caudal extraído del pozo ingresara al tratamiento. Como primer ajuste se realizó el "),
         t("cambio de la manga del filtro bolsa", true), t(", lo que mejoró de inmediato la capacidad de filtración y permitió elevar el ingreso a la UF hasta "),
         t("25 m³/h", true), t(". En paralelo se llevó el clarifloculador a "), t("45 Hz", true),
         t(" y, de forma independiente, se dejó la válvula de purga abierta “un diente” para sostener la calidad del efluente del clarifloculador; conviene precisar que esta purga evacúa el lodo sedimentado, pero no corrige la pared de lodo acumulada en las colmenas posteriores. Con esta configuración la segunda piscina quedó estable y sin rebose durante el ciclo de filtración, y el sistema en equilibrio.")]),
      p([t("Sobre esa base estable se probó un incremento a "), t("26 m³/h", true),
         t(" para tantear el margen disponible. La UF respondió con una alarma por diferencial de presión, indicando que pedía un CEB; como el último lavado había sido 8 horas antes y el tanque de recirculación estaba en nivel bajo, se decidió no detener la operación para el CEB (que toma ~40 min) y se retornó a "),
         t("25 m³/h", true), t(". A esta frecuencia el sistema sostiene en promedio unos 20 minutos de filtración por tramo antes de pedir nuevamente lavado, por lo que se definió mantener este caudal y dejar el "),
         t("CEB ácido programado", true), t(" para ejecutarlo en cuanto el tanque de recirculación recupere nivel y validar si, con la UF recién lavada, se habilita subir más.")]),
      p([t("Un dato clave que arrojaron los ajustes es el comportamiento de la segunda piscina: en ciclo de filtración a 45 Hz se mantiene equilibrada, sin rebosarse y sin quedarse sin agua para alimentar el clarifloculador; solo durante el enjuague —cuando el clarifloculador deja de enviar— empieza a rebosarse pasados unos 8 minutos. Este balance hidráulico confirma que, en operación estable, "),
         t("el pozo entrega del orden de 25 m³/h (≈6,9 lps)", true),
         t(". Como ajuste de cierre, para recuperar el nivel de la segunda piscina se bajó la frecuencia del clarifloculador a "),
         t("44 Hz", true), t(", quedando la UF a las 12:00 en torno a "), t("16 m³/h", true), t(" mientras se mantiene a la espera del CEB.")]),

      h2("Novedades y hallazgos"),
      p([t("Durante la jornada se detectaron dos novedades relevantes. La primera es que la "),
         t("válvula solenoide", true), t(" del clarifloculador se recalienta durante la operación; al hacerlo deja de actuar automáticamente, por lo que la purga debe realizarse de forma manual. La segunda es una "),
         t("acumulación de lodo en las colmenas de la zona posterior del clarifloculador", true),
         t(": dado que la purga se encuentra únicamente en la parte frontal, las colmenas delanteras se mantienen relativamente limpias, pero las traseras quedan muy saturadas al estar la purga demasiado lejos. Esta acumulación deteriora la calidad del efluente del clarifloculador, lo que a su vez satura el filtro bolsa y eleva la presión transmembrana (TMP) de la UF; en consecuencia, además de generar las alarmas observadas, reduce los tiempos efectivos de filtración por ciclo.")]),

      h2("Conclusiones y recomendaciones"),
      p([t("El seguimiento permite concluir que el pozo entrega de forma sostenible un caudal cercano a los "),
         t("24–25 m³/h, equivalentes a unos 6,9 lps", true),
         t(". El valor de 25 m³/h se alcanzó, pero quedó al límite —de hecho, de no haberse alarmado la UF probablemente no se habría sostenido—, por lo que se recomienda fijar el "),
         t("caudal operativo estable en 24 m³/h (≈6,7 lps)", true),
         t(". No fue posible validar un caudal mayor, ya que las restricciones de la UF (presión y CEB pendiente) impidieron subir la salida del clarifloculador. Como acciones a seguir se recomienda: "),
         t("programar el CEB ácido", true), t(" tan pronto el tanque de recirculación recupere nivel y verificar si, con la UF recién lavada, se permite elevar el caudal; "),
         t("habilitar una purga en la zona posterior del clarifloculador", true), t(" para evitar la acumulación de lodo en las colmenas traseras; y "),
         t("revisar la válvula solenoide", true), t(" que presenta recalentamiento.")]),

      new Paragraph({ spacing: { before: 240 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "C9D1DA", space: 4 } },
        children: [new TextRun({ text: "Informe de seguimiento operativo PTAP — 17/06/2026. Datos consolidados a partir del registro horario de eficiencias UF y de la bitácora de operación de la jornada.", size: 16, color: "7A828C" })] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("SEGUIMIENTO_PTAP_HORA_A_HORA_17_06_2026.docx", buffer);
  console.log("OK");
});
