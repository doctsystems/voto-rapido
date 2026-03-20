import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VoteReport } from "../votes/vote-report.entity";
import { Role } from "../../common/enums/role.enum";
import * as ExcelJS from "exceljs";
import * as PDFKit from "pdfkit";
import { Response } from "express";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(VoteReport) private reportRepo: Repository<VoteReport>,
  ) {}

  private buildBaseQuery(currentUser: any) {
    const query = this.reportRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.delegate", "d")
      .leftJoinAndSelect("d.party", "dp")
      .leftJoinAndSelect("r.table", "t")
      .leftJoinAndSelect("r.entries", "e")
      .leftJoinAndSelect("e.party", "p")
      .leftJoinAndSelect("e.electionType", "et");

    if (currentUser.role === Role.DELEGADO) {
      query.where("d.id = :userId", { userId: currentUser.sub });
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      query.where("dp.id = :partyId", { partyId: currentUser.partyId });
    }
    return query;
  }

  async exportExcel(currentUser: any, res: Response) {
    const reports = await this.buildBaseQuery(currentUser).getMany();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VotoRápido";
    workbook.created = new Date();

    // Summary sheet
    const summary = workbook.addWorksheet("Resumen");
    summary.columns = [
      { header: "Mesa", key: "table", width: 15 },
      { header: "Delegado", key: "delegate", width: 25 },
      { header: "Partido", key: "party", width: 20 },
      { header: "Estado", key: "status", width: 12 },
      { header: "Total Votos", key: "totalVotes", width: 14 },
      { header: "Nulos", key: "nullVotes", width: 10 },
      { header: "Blancos", key: "blankVotes", width: 10 },
      { header: "Enviado", key: "submittedAt", width: 20 },
    ];

    // Style header
    summary.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B4F72" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });

    reports.forEach((r) => {
      summary.addRow({
        table: r.table?.number,
        delegate: r.delegate?.fullName,
        party: r.delegate?.party?.name,
        status: r.status,
        totalVotes: r.totalVotes,
        nullVotes: r.nullVotes,
        blankVotes: r.blankVotes,
        submittedAt: r.submittedAt?.toLocaleString("es-EC") || "-",
      });
    });

    // Detail sheet
    const detail = workbook.addWorksheet("Detalle por Partido");
    detail.columns = [
      { header: "Mesa", key: "table", width: 15 },
      { header: "Tipo Elección", key: "electionType", width: 20 },
      { header: "Partido", key: "party", width: 25 },
      { header: "Orden", key: "ballotOrder", width: 10 },
      { header: "Votos", key: "votes", width: 12 },
    ];
    detail.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B4F72" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });

    reports.forEach((r) => {
      (r.entries || []).forEach((e) => {
        detail.addRow({
          table: r.table?.number,
          electionType: e.electionType?.name,
          party: e.party?.name,
          ballotOrder: e.party?.ballotOrder,
          votes: e.votes,
        });
      });
    });

    this.logger.log(`Excel exportado por ${currentUser.username}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=voto-rapido-${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportPdf(currentUser: any, res: Response) {
    const reports = await this.buildBaseQuery(currentUser).getMany();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=voto-rapido-${Date.now()}.pdf`,
    );

    const doc = new PDFKit({ margin: 50 });
    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .fillColor("#1B4F72")
      .text("VotoRápido - Reporte de Votación", { align: "center" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Generado: ${new Date().toLocaleString("es-EC")}`, {
        align: "center",
      });
    doc.moveDown(2);

    // Table of reports
    reports.forEach((r, i) => {
      if (i > 0) doc.moveDown();
      doc
        .fontSize(12)
        .fillColor("#1B4F72")
        .text(
          `Mesa ${r.table?.number} - ${r.table?.school?.name ?? ""}`,
        );
      doc.fontSize(10).fillColor("#333");
      doc.text(
        `Delegado: ${r.delegate?.fullName} | Estado: ${r.status} | Total votos: ${r.totalVotes}`,
      );
      doc.text(`Nulos: ${r.nullVotes} | Blancos: ${r.blankVotes}`);
      doc.moveDown(0.5);

      // Group entries by election type
      const byType: Record<string, any[]> = {};
      (r.entries || []).forEach((e) => {
        const typeName = e.electionType?.name || "General";
        if (!byType[typeName]) byType[typeName] = [];
        byType[typeName].push(e);
      });

      Object.entries(byType).forEach(([typeName, entries]) => {
        doc.fontSize(10).fillColor("#1B4F72").text(`  ${typeName}:`);
        entries.forEach((e) => {
          doc
            .fontSize(9)
            .fillColor("#333")
            .text(
              `    Orden ${e.party?.ballotOrder} - ${e.party?.name}: ${e.votes} votos`,
            );
        });
      });
    });

    doc.end();
    this.logger.log(`PDF exportado por ${currentUser.username}`);
  }
}
