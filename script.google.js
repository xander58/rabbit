const SHEET_ID = 'table id';
const SHEET_NAME = 'readings';

function doGet(e) {
  const action = e.parameter.action || 'getAll';
  const callback = e.parameter.callback;
  
  let result;
  
  if (action === 'getAll') {
    result = getAllReadings();
  } else if (action === 'getStats') {
    const period = e.parameter.period || 'all';
    result = getStats(period);
  } else {
    result = { error: 'Invalid action' };
  }
  
  // JSONP ответ
  const json = JSON.stringify(result);
  return ContentService
    .createTextOutput(callback ? `${callback}(${json})` : json)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    addReading(data);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addReading(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sheet.appendRow([
    data.timestamp,
    data.date,
    data.time,
    data.period,
    parseInt(data.systolic),
    parseInt(data.diastolic),
    parseInt(data.pulse)
  ]);
}

function getAllReadings() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const readings = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    readings.push({
      timestamp: row[0] || '',
      date: row[1] || '',
      time: row[2] || '',
      period: String(row[3] || '').trim(),
      systolic: parseInt(row[4]) || 0,
      diastolic: parseInt(row[5]) || 0,
      pulse: parseInt(row[6]) || 0
    });
  }
  
  return readings.reverse();
}

function getStats(period) {
  const readings = getAllReadings();
  const now = new Date();
  let filtered = readings;
  
  if (period === 'week') {
    const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    filtered = readings.filter(r => {
      const rDate = new Date(r.timestamp);
      return rDate >= cutoff;
    });
  } else if (period === 'month') {
    const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
    filtered = readings.filter(r => {
      const rDate = new Date(r.timestamp);
      return rDate >= cutoff;
    });
  }
  
  if (filtered.length === 0) {
    return { count: 0, avgSystolic: 0, avgDiastolic: 0, avgPulse: 0, readings: [] };
  }
  
  const sum = (key) => filtered.reduce((total, r) => total + (r[key] || 0), 0);
  const avg = (key) => Math.round(sum(key) / filtered.length);
  
  return {
    count: filtered.length,
    avgSystolic: avg('systolic'),
    avgDiastolic: avg('diastolic'),
    avgPulse: avg('pulse'),
    readings: filtered.slice(0, 50)
  };
}
