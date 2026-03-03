const fs = require('fs');
const data = fs.readFileSync('issues.json', 'utf16le');
const issues = JSON.parse(data.trim());
issues.forEach(i => console.log('#' + i.number + ' | ' + i.title + ' | [' + i.labels.map(l => l.name).join(', ') + ']'));
