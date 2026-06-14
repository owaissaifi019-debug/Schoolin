const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../style.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Match the duplicate block precisely and remove it
const duplicateBlock = `
.post-avatar-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block;
}

.post-avatar-placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
}`;

if (content.includes(duplicateBlock)) {
  content = content.replace(duplicateBlock, '');
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Successfully removed duplicate block from style.css');
} else {
  console.log('Duplicate block not found or already removed.');
}
