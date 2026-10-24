import { formatQuantity, perUnit } from './units.js';

// jsPDF's built-in fonts have no ₹ glyph, so PDFs use "Rs."
const money = (n) => `Rs. ${n.toFixed(2)}`;
const dateTime = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// Draws one bill onto a fresh A5 page
function drawBill(doc, bill, { shopName, address }) {
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  let y = 20;

  // Shop name, big and centred
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(20);
  const name = doc.splitTextToSize(shopName, W - 2 * M);
  doc.text(name, W / 2, y, { align: 'center' });
  y += name.length * 9 - 2;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(95);
  if (address) {
    const lines = doc.splitTextToSize(address, W - 2 * M);
    doc.text(lines, W / 2, y, { align: 'center' });
    y += lines.length * 4.5;
  }
  y += 1;
  doc.setDrawColor(20).setLineWidth(0.6).line(M, y, W - M, y).setLineWidth(0.2);
  y += 7;

  // Bill number on the left, date and time on the right
  doc.setFontSize(10).setTextColor(30);
  doc.text(`Bill No.: #${bill.bill_number}`, M, y);
  doc.text(`Date: ${dateTime(bill.issued_at)}`, W - M, y, { align: 'right' });
  y += 5;

  const cols = [M, W - M - 80, W - M - 42, W - M];
  const row = (cells, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const name = doc.splitTextToSize(cells[0], cols[1] - M - 4);
    doc.text(name, cols[0], y);
    doc.text(cells[1], cols[1], y);
    doc.text(cells[2], cols[2], y);
    doc.text(cells[3], cols[3], y, { align: 'right' });
    y += name.length * 5 + 2;
  };
  const rule = () => { doc.setDrawColor(210).line(M, y - 3.5, W - M, y - 3.5); };

  y += 4;
  doc.setTextColor(30).setFontSize(10);
  rule();
  y += 2;
  row(['Item', 'Price', 'Qty', 'Amount'], true);
  rule();
  y += 1;
  for (const i of bill.items) {
    if (y > doc.internal.pageSize.getHeight() - 24) { doc.addPage(); y = 18; }
    row([i.item_name, `${money(i.price)}${perUnit(i.unit)}`, formatQuantity(i.quantity, i.unit), money(i.amount)]);
  }
  y += 1;
  doc.setDrawColor(20).setLineWidth(0.6).line(M, y - 3.5, W - M, y - 3.5).setLineWidth(0.2);
  y += 4;
  doc.setFontSize(13);
  row(['Grand Total', '', '', money(bill.total)], true);

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(130);
  doc.text('Thank you for shopping with us!', W / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
}

// Builds one PDF per bill and downloads them together as a zip. Libraries load only when this runs.
export async function downloadBillsZip(bills, shop) {
  const { shopName } = shop;
  const [{ jsPDF }, { default: JSZip }] = await Promise.all([import('jspdf'), import('jszip')]);
  const zip = new JSZip();
  for (const bill of bills) {
    const doc = new jsPDF({ format: 'a5' });
    drawBill(doc, bill, shop);
    const day = new Date(bill.issued_at).toISOString().slice(0, 10);
    zip.file(`bill-${bill.bill_number}-${day}.pdf`, doc.output('arraybuffer'));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${shopName.replace(/[^\w-]+/g, '-')}-bills-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
