import PDFDocument from 'pdfkit';
import { LEGAL_DISCLAIMER } from '@echrimheni/shared';

export interface ReportPdfData {
  reportNumber: string;
  date: string;
  score: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    mileage?: number;
    askingPrice?: number;
    location: string;
  };
  expert: {
    fullName: string;
    phone: string;
    wilaya: string;
    rcNumber?: string;
  };
  sections: {
    title: string;
    items: {
      name: string;
      status: string;
      severity?: string;
      comment?: string;
    }[];
  }[];
  positivePoints: string[];
  watchpoints: string[];
  majorDefects: string[];
  criticalDefects: string[];
  summary: string;
}

export async function generateInspectionPdf(data: ReportPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Branding
      doc.fontSize(20).fillColor('#059669').text('ECHRIMHENI', 40, 40);
      doc.fontSize(9).fillColor('#64748b').text('ACHETER EN CONFIANCE. FAIRE VERIFIER AVANT DE PAYER.', 40, 65);
      doc.fontSize(10).fillColor('#0f172a').text('Rapport N : ' + data.reportNumber, 350, 40, { align: 'right' });
      doc.fontSize(9).fillColor('#64748b').text('Date : ' + data.date, 350, 55, { align: 'right' });

      doc.moveTo(40, 80).lineTo(555, 80).strokeColor('#e2e8f0').stroke();

      // Score Banner
      doc.rect(40, 95, 515, 60).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(12).fillColor('#334155').text('SCORE GLOBAL INDICATIF DE L INSPECTION', 60, 115);
      
      const scoreColor = data.score >= 80 ? '#059669' : data.score >= 50 ? '#d97706' : '#dc2626';
      doc.fontSize(24).fillColor(scoreColor).text(data.score + ' / 100', 380, 112, { align: 'right' });

      // Vehicle & Inspector Information Box
      doc.fontSize(11).fillColor('#0f172a').text('1. Informations du Vehicule & de l Expert', 40, 175);
      
      doc.fontSize(9).fillColor('#1e293b');
      doc.text('Vehicule : ' + data.vehicle.make + ' ' + data.vehicle.model + ' (' + data.vehicle.year + ')', 40, 195);
      doc.text('Kilometrage : ' + (data.vehicle.mileage ? data.vehicle.mileage + ' km' : 'Non renseigne'), 40, 210);
      doc.text('Localisation : ' + data.vehicle.location, 40, 225);

      doc.text('Expert : ' + data.expert.fullName, 320, 195);
      doc.text('Telephone : ' + data.expert.phone, 320, 210);
      doc.text('RC : ' + (data.expert.rcNumber || 'Certifie conforme'), 320, 225);

      // Synthesis & Highlights
      doc.fontSize(11).fillColor('#0f172a').text('2. Synthese & Points Notables', 40, 255);
      doc.fontSize(9).fillColor('#334155').text(data.summary, 40, 275, { width: 515 });

      let currentY = 310;
      doc.fontSize(9).fillColor('#059669').text('Points positifs releves (' + data.positivePoints.length + ') :', 40, currentY);
      currentY += 15;
      data.positivePoints.slice(0, 4).forEach((pt) => {
        doc.fontSize(8).fillColor('#1e293b').text('- ' + pt, 55, currentY);
        currentY += 12;
      });

      if (data.watchpoints.length > 0) {
        currentY += 5;
        doc.fontSize(9).fillColor('#d97706').text('Points a surveiller (' + data.watchpoints.length + ') :', 40, currentY);
        currentY += 15;
        data.watchpoints.slice(0, 3).forEach((wp) => {
          doc.fontSize(8).fillColor('#1e293b').text('- ' + wp, 55, currentY);
          currentY += 12;
        });
      }

      if (data.criticalDefects.length > 0) {
        currentY += 5;
        doc.fontSize(9).fillColor('#dc2626').text('DEFAUTS CRITIQUES (' + data.criticalDefects.length + ') :', 40, currentY);
        currentY += 15;
        data.criticalDefects.forEach((cd) => {
          doc.fontSize(8).fillColor('#991b1b').text('- ' + cd, 55, currentY);
          currentY += 12;
        });
      }

      // Checklist Sections Detail (Page 2)
      doc.addPage();
      doc.fontSize(11).fillColor('#0f172a').text('3. Grille de Controle Detaillee (7 Sections)', 40, 40);
      
      let sectionY = 65;
      data.sections.forEach((sec) => {
        doc.fontSize(10).fillColor('#0284c7').text(sec.title, 40, sectionY);
        sectionY += 15;
        sec.items.forEach((item) => {
          const itemStatus = '[' + item.status + ']';
          const line = itemStatus + ' ' + item.name + (item.comment ? ' - ' + item.comment : '');
          doc.fontSize(8).fillColor('#334155').text(line, 55, sectionY);
          sectionY += 12;
        });
        sectionY += 6;
      });

      // Legal Limitation Disclaimer (MANDATORY)
      doc.rect(40, 710, 515, 65).fillAndStroke('#fef2f2', '#fecaca');
      doc.fontSize(8).fillColor('#991b1b').text('MENTION LEGALE DE LIMITATION DE RESPONSABILITE :', 50, 718);
      doc.fontSize(7).fillColor('#7f1d1d').text(LEGAL_DISCLAIMER, 50, 730, { width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
