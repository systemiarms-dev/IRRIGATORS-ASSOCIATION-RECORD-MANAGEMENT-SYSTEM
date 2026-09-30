const fs = require('fs');
const files = [
  'app/actions/statements.ts',
  'app/actions/fixedAssets.ts',
  'app/actions/transactions.ts',
  'app/api/upload-receipt/route.ts',
];
const needle = "if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'treasurer') {";
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const lines = raw.split(/\r?\n/);
  console.log('=== ' + f + '  CRLF=' + raw.includes('\r\n'));
  lines.forEach((l, i) => {
    if (l.includes(needle)) {
      const indent = l.match(/^ */)[0].length;
      console.log('  ' + (i + 1) + ': indent=' + indent + ' next=' + JSON.stringify((lines[i + 1] || '').trim()));
    }
  });
}
