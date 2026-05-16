const fs = require('fs');
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY3jP4PgfAAWpA511t17gAAAAAElFTkSuQmCC'; // 1x1 transparent
fs.writeFileSync('build/icon.png', Buffer.from(base64Png, 'base64'));
