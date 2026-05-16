import { app, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

app.whenReady().then(() => {
  const iconSvgPath = path.resolve('build/icon.svg');
  const iconPngPath = path.resolve('build/icon.png');
  const image = nativeImage.createFromPath(iconSvgPath);
  fs.writeFileSync(iconPngPath, image.toPNG());
  console.log('Icon generated at ' + iconPngPath);
  app.quit();
});
