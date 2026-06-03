const crypto = require('crypto');
const { MOMO } = require('../config');

// Ky HMAC-SHA256 theo chuan MoMo (rawSignature -> hex).
function sign(rawSignature) {
  return crypto.createHmac('sha256', MOMO.secretKey).update(rawSignature).digest('hex');
}

// Tao yeu cau thanh toan toi MoMo AIO v2, tra ve { payUrl, momoOrderId } hoac nem loi.
// orderDbId: id don hang trong DB (de map lai khi MoMo callback ve).
async function createPayment({ orderDbId, amount, orderInfo, requestId, momoOrderId }) {
  const extraData = Buffer.from(JSON.stringify({ orderDbId })).toString('base64');

  // Thu tu field trong rawSignature la BAT BUOC (alphabet), khong duoc doi.
  const rawSignature =
    `accessKey=${MOMO.accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${MOMO.ipnUrl}` +
    `&orderId=${momoOrderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${MOMO.partnerCode}` +
    `&redirectUrl=${MOMO.redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${MOMO.requestType}`;

  const body = {
    partnerCode: MOMO.partnerCode,
    partnerName: 'MOT Store',
    storeId: 'MOTStore',
    requestId,
    amount: String(amount),
    orderId: momoOrderId,
    orderInfo,
    redirectUrl: MOMO.redirectUrl,
    ipnUrl: MOMO.ipnUrl,
    lang: MOMO.lang,
    requestType: MOMO.requestType,
    autoCapture: true,
    extraData,
    signature: sign(rawSignature),
  };

  const res = await fetch(MOMO.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.resultCode !== 0 || !data.payUrl) {
    const err = new Error(data.message || 'MoMo từ chối tạo giao dịch.');
    err.status = 502;
    err.momo = data;
    throw err;
  }
  return { payUrl: data.payUrl, momoOrderId };
}

// Hoan tien giao dich da thanh toan toi MoMo AIO v2.
// transId: ma giao dich goc MoMo tra ve (KHONG phai orderId cua minh).
// orderId: ma yeu cau hoan tien MOI (phai khac orderId goc).
// amount: so tien hoan (sandbox mac dinh chi cho hoan toan bo = so tien goc).
async function refund({ amount, transId, orderId, requestId, description }) {
  if (!MOMO.refundEndpoint) {
    const err = new Error('Chưa cấu hình MOMO_REFUND_ENDPOINT.');
    err.status = 500;
    throw err;
  }

  // Thu tu field khi ky refund KHAC voi luc create (alphabet, khong duoc doi).
  const rawSignature =
    `accessKey=${MOMO.accessKey}` +
    `&amount=${amount}` +
    `&description=${description}` +
    `&orderId=${orderId}` +
    `&partnerCode=${MOMO.partnerCode}` +
    `&requestId=${requestId}` +
    `&transId=${transId}`;

  const body = {
    partnerCode: MOMO.partnerCode,
    orderId,
    requestId,
    amount: Number(amount),
    transId: Number(transId),
    lang: MOMO.lang,
    description: description || '',
    signature: sign(rawSignature),
  };

  const res = await fetch(MOMO.refundEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.resultCode !== 0) {
    const err = new Error(data.message || 'MoMo từ chối hoàn tiền.');
    err.status = 502;
    err.momo = data;
    throw err;
  }
  return data;
}

// Xac thuc chu ky MoMo gui kem khi redirect/IPN. Tra ve true neu hop le.
function verifyCallback(params) {
  const rawSignature =
    `accessKey=${MOMO.accessKey}` +
    `&amount=${params.amount}` +
    `&extraData=${params.extraData}` +
    `&message=${params.message}` +
    `&orderId=${params.orderId}` +
    `&orderInfo=${params.orderInfo}` +
    `&orderType=${params.orderType}` +
    `&partnerCode=${params.partnerCode}` +
    `&payType=${params.payType}` +
    `&requestId=${params.requestId}` +
    `&responseTime=${params.responseTime}` +
    `&resultCode=${params.resultCode}` +
    `&transId=${params.transId}`;
  const expected = sign(rawSignature);
  return expected === params.signature;
}

// Giai ma extraData (base64 JSON) -> { orderDbId }.
function decodeExtraData(extraData) {
  try {
    return JSON.parse(Buffer.from(String(extraData || ''), 'base64').toString('utf-8')) || {};
  } catch {
    return {};
  }
}

module.exports = { createPayment, refund, verifyCallback, decodeExtraData, sign };
