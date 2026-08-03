const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageOrientation } = require("docx");

const AZUL = "1F4E79";
const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D1DA" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 40, bottom: 40, left: 60, right: 60 };

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
  ["6:00", "5296,82", "4847,56", "16,37", "15,11", "4,55", "4,20", "92,30"],
  ["7:00", "5313,19", "4862,67", "20,20", "19,57", "5,61", "5,44", "96,88"],
  ["8:00", "5333,39", "4882,24", "21,97", "19,42", "6,10", "5,39", "88,39"],
  ["9:00", "5355,36", "4901,66", "13,42", "6,26", "3,73", "1,74", "46,65"],
  ["10:00", "5368,78", "4907,92", "10,31", "4,82", "2,86", "1,34", "46,75"],
  ["11:00", "5379,09", "4912,74", "25,97", "25,96", "7,21", "7,21", "99,96"],
  ["12:00", "5405,06", "4938,70", "—", "—", "—", "—", "—"],
];

const tableRows = [];
tableRows.push(new TableRow({ tableHeader: true, children: header.map((h, i) => hCell(h, COLS[i])) }));
rows.forEach((r, idx) => {
  const cells = [];
  if (idx === 0) cells.push(dCell("18/06/2026", COLS[0], { rowSpan: 7, bold: true, fill: "FAFBFC" }));
  r.forEach((v, j) => cells.push(dCell(v, COLS[j + 1])));
  tableRows.push(new TableRow({ children: cells }));
});
tableRows.push(new TableRow({ children: [
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[0] + COLS[1], type: WidthType.DXA },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL (m³)", bold: true, size: 15 })] })] }),
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[2] + COLS[3], type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
  dCell("108,24", COLS[4], { bold: true, fill: "F5F6F8" }),
  dCell("91,14", COLS[5], { bold: true, fill: "F5F6F8" }),
  dCell("", COLS[6], { fill: "F5F6F8" }),
  dCell("", COLS[7], { fill: "F5F6F8" }),
  dCell("", COLS[8], { fill: "F5F6F8" }),
] }));
tableRows.push(new TableRow({ children: [
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[0] + COLS[1], type: WidthType.DXA },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PROMEDIO", bold: true, size: 15 })] })] }),
  new TableCell({ borders, columnSpan: 2, margins: cellMargins, shading: { fill: "F5F6F8", type: ShadingType.CLEAR },
    width: { size: COLS[2] + COLS[3], type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
  dCell("18,04", COLS[4], { bold: true, fill: "F5F6F8" }),
  dCell("15,19", COLS[5], { bold: true, fill: "F5F6F8" }),
  dCell("5,01", COLS[6], { bold: true, fill: "F5F6F8" }),
  dCell("4,22", COLS[7], { bold: true, fill: "F5F6F8" }),
  dCell("78,49", COLS[8], { bold: true, fill: "F5F6F8" }),
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
        children: [new TextRun({ text: "Fecha de operación: 18 de junio de 2026", color: "5A6470", size: 18 })] }),

      p([t("Continuando con el objetivo de elevar el caudal de tratamiento de la planta, la jornada del 18 de junio se concentró en el "),
         t("aforo de las bombas de dosificación química", true), t(", la "), t("puesta a punto y ejecución del CEB ácido", true),
         t(" y una "), t("prueba de operación a caudal alto", true), t(", subiendo el set de la UF a "), t("39 m³/h", true),
         t(" (frente a los 22 m³/h previos). El propósito fue verificar hasta qué caudal y por cuánto tiempo logra sostener la filtración la UF una vez corregidas las condiciones de dosificación.")]),

      h2("Aforo de las bombas de dosificación química"),
      p([t("El primer frente de trabajo fue el aforo de las bombas dosificadoras, que arrojó un hallazgo importante: la "),
         t("bomba de coagulante", true), t(" indica en pantalla una dosificación de "), t("12,5 L/h", true),
         t(", pero al aforarla físicamente entrega apenas "), t("4,74 L/h", true),
         t(". Es decir, el dato que muestra el equipo no corresponde con la dosificación real, por lo que en adelante la operación debe guiarse por el aforo y no por la lectura de pantalla. En cuanto al "),
         t("polímero (floculante)", true), t(", se encontró en muy mal estado, prácticamente coagulado y con grumos; fue necesario lavar por completo el tanque —que tenía bastante polímero acumulado en grumos que podía afectar el proceso de varias formas— y prepararlo de nuevo, dejándolo en una proporción de "),
         t("500 g en 500 L", true), t(". De aquí se desprende un punto de mejora claro: no se cuenta con un embudo ni con los elementos adecuados para preparar el polímero correctamente. El "),
         t("peróxido", true), t(", por su parte, se aforó y se encontró correcto, en "), t("12,5 ppm", true),
         t(", valor adecuado para una buena oxidación. Adicionalmente se detectó que, al inicio, la dosificación estaba dirigida "),
         t("hacia la torre de aireación y no hacia el serpentín", true), t(".")]),

      h2("CEB ácido"),
      p([t("Para realizar el CEB ácido se encontró que el "), t("racor de la bomba del CEB estaba dañado", true),
         t(", por lo que primero hubo que repararlo y solo entonces se pudo iniciar el lavado. El CEB se ejecutó con "),
         t("ácido sulfúrico (del GEM)", true), t(", dado que no se dispone de ácido cítrico.")]),

      h2("Registro de eficiencias UF (06:00 – 12:00)"),
      table,
      new Paragraph({ spacing: { before: 80, after: 160 }, alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: "Eficiencia promedio de la UF durante la ventana monitoreada: ", size: 17, color: "5A6470" }),
                   new TextRun({ text: "78,49 %", size: 17, bold: true, color: AZUL }),
                   new TextRun({ text: ". Se observa una caída marcada de eficiencia entre las 09:00 y 10:00 (46,65 % y 46,75 %), coincidente con las interrupciones por presión y los ajustes de nivel del clarifloculador durante la prueba a caudal alto.", size: 17, color: "5A6470" })] }),

      h2("Prueba de operación a caudal alto"),
      p([t("Una vez estabilizadas las condiciones químicas y ejecutado el CEB ácido, se arrancó el proceso con un "),
         t("set de UF de 39 m³/h", true), t(" —partiendo del clarifloculador en nivel alto y la piscina 2 a "), t("46,5 Hz", true),
         t("—, sin generar rebose en la segunda piscina. Aunque el set era de 39, el "), t("caudal real de ingreso a la UF fue de 34,8 m³/h", true),
         t("; a los dos minutos del arranque la "), t("presión de alimentación marcaba 26,7 PSI", true), t(" y la "),
         t("presión de entrada a la UF 26 PSI", true), t(", con un tiempo de ciclo de filtración configurado en "), t("60 minutos", true),
         t(". En el marco de esta prueba se modificó la "), t("alarma de presión de la UF", true),
         t(", que pasó de dispararse a 25 PSI con 10 minutos de espera a hacerlo a "), t("30 PSI con 3 minutos", true), t(".")]),
      p([t("Llevando el clarifloculador entre "), t("47 y 50 Hz", true),
         t(" —buscando no rebosar la segunda piscina pero al tiempo sacarle volumen al clarifloculador— se alcanzó una alimentación a la UF cercana a los "),
         t("36 m³/h", true), t(". Sin embargo, este tramo duró únicamente "), t("9 a 10 minutos", true),
         t(" antes de que el clarifloculador se alarmara por "), t("nivel bajo", true),
         t(", lo que indica que se estaba superando su caudal de alimentación. Fue necesario detenerse para que el clarifloculador recuperara su nivel hasta el flotador (nivel máximo), lo que tomó "),
         t("aproximadamente 15 a 20 minutos", true), t(". Al re-arrancar, el caudal se fue bajando a "), t("32–33 m³/h", true),
         t(", arrancando ya en torno a 27 PSI, y se sostuvo "), t("12 minutos", true), t(" antes de alarmar por presión.")]),
      p([t("En los tramos finales la UF apenas lograba sostenerse entre "), t("4 y 7 minutos", true),
         t(", iniciando alrededor de "), t("29,4 m³/h", true), t(" y deteniéndose por "), t("alta presión transmembrana", true),
         t(", no por falta de agua —el set de la UF seguía en 39 m³/h y la alimentación al clarifloculador en 50 Hz—. Entre paradas se aprovechaba para realizar los enjuagues de la UF y reanudar el ciclo.")]),

      h2("Análisis y conclusiones"),
      p([t("La UF solo se detuvo "), t("dos veces por nivel bajo del clarifloculador", true),
         t(", y ello se debió a que en esos momentos "), t("aún no se había arrancado con el clarifloculador en nivel alto", true),
         t("; una vez se partió con el clarifloculador en su nivel máximo, las paradas dejaron de ser por nivel y pasaron a ser por "),
         t("diferencial de presión transmembrana (TMP)", true),
         t(". La causa probable de este comportamiento no es únicamente el mayor caudal, sino la "),
         t("deficiente calidad del agua que llega a la UF", true),
         t(": al manipular de forma tan amplia los niveles de alimentación del clarifloculador, la dosificación química resultó muy variable y no se logró estabilizar, generando una mala floculación que satura la UF y eleva su presión transmembrana. Cabe anotar que "),
         t("no fue necesario realizar cambio de manga", true), t(", ya que el diferencial de presión llegó hasta 17 PSI.")]),

      h2("Pendientes y puntos por corregir"),
      p([t("Quedan varios puntos por atender. El primero es la "), t("bomba de coagulante", true),
         t(", cuyo dato de pantalla no corresponde con la dosificación real, por lo que debe operarse con base en el aforo. El segundo es la "),
         t("preparación del polímero", true), t(", que requiere disponer de un embudo y los elementos adecuados para hacerse correctamente. Finalmente, las "),
         t("purgas siguen realizándose de forma manual", true),
         t(": como el clarifloculador no se estabiliza y la frecuencia se mantiene constante, el "),
         t("manto de lodo de las colmenas traseras persiste", true),
         t(", por lo que es necesario buscar la forma de "),
         t("purgar esa zona posterior del clarifloculador sin tener que desocupar todo el sistema", true), t(".")]),

      h2("Próximos pasos"),
      p([t("Una vez se cuente con una "), t("dosificación química estable", true),
         t(" para estos nuevos caudales, se repetirá la prueba llenando el clarifloculador hasta su nivel máximo, con el fin de medir cuánto tiempo logra sostener la filtración la UF cuando se le alimenta agua de buena calidad, verificar si efectivamente se alcanzan los "),
         t("39 m³/h", true), t(" y determinar el tiempo de filtración logrado antes de que el pozo o el clarifloculador limiten la operación.")]),

      new Paragraph({ spacing: { before: 240 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "C9D1DA", space: 4 } },
        children: [new TextRun({ text: "Informe de seguimiento operativo PTAP — 18/06/2026. Datos consolidados a partir del registro de operación y los aforos de la jornada.", size: 16, color: "7A828C" })] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("SEGUIMIENTO_PTAP_HORA_A_HORA_18_06_2026.docx", buffer);
  console.log("OK");
});
