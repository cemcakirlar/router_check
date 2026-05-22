const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const desktopAppsDir = path.join(__dirname, '..', 'desktop_apps');

function getBuildScripts() {
  if (!fs.existsSync(desktopAppsDir)) {
    console.error(`Error: Directory not found: ${desktopAppsDir}`);
    process.exit(1);
  }

  const items = fs.readdirSync(desktopAppsDir);
  const scripts = [];

  for (const item of items) {
    const itemPath = path.join(desktopAppsDir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      const buildScriptPath = path.join(itemPath, 'build.sh');
      if (fs.existsSync(buildScriptPath)) {
        scripts.push({
          appName: item,
          scriptPath: buildScriptPath,
          dir: itemPath
        });
      }
    }
  }

  // Sort them so they run in order (01_, 02_, 03_, 05_, 06_)
  scripts.sort((a, b) => a.appName.localeCompare(b.appName));
  return scripts;
}

function runBuilds() {
  const scripts = getBuildScripts();
  console.log(`🚀 Found ${scripts.length} build scripts to run.\n`);

  const results = [];

  for (const { appName, scriptPath, dir } of scripts) {
    console.log(`================================================================================`);
    console.log(`🏗️  Building application variant: ${appName}`);
    console.log(`📂 Directory: ${dir}`);
    console.log(`================================================================================`);

    // Ensure the script is executable
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (err) {
      console.warn(`⚠️  Warning: Failed to set executable permission on ${scriptPath}: ${err.message}`);
    }

    const startTime = Date.now();
    
    // Run the build script
    const result = spawnSync('./build.sh', {
      cwd: dir,
      stdio: 'inherit',
      shell: true
    });

    let buildSuccessful = result.status === 0;
    let errorMsg = result.error ? result.error.message : `Exit code ${result.status}`;

    // If build.sh succeeded, check if we need to run npm run build
    if (buildSuccessful) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.scripts && pkg.scripts.build) {
            console.log(`\n📦 Running final package build (npm run build) for ${appName}...`);
            const npmResult = spawnSync('npm', ['run', 'build'], {
              cwd: dir,
              stdio: 'inherit',
              shell: true
            });
            if (npmResult.status !== 0) {
              buildSuccessful = false;
              errorMsg = npmResult.error ? npmResult.error.message : `npm build failed with exit code ${npmResult.status}`;
            }
          }
        } catch (err) {
          console.error(`⚠️  Failed to read/parse package.json in ${dir}: ${err.message}`);
          buildSuccessful = false;
          errorMsg = `package.json parse error: ${err.message}`;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (buildSuccessful) {
      console.log(`\n✅ Successfully built ${appName} in ${duration}s\n`);
      results.push({ appName, success: true, duration });
    } else {
      console.error(`\n❌ Failed to build ${appName} in ${duration}s: ${errorMsg}\n`);
      results.push({ appName, success: false, duration, error: errorMsg });
    }
  }

  console.log(`================================================================================`);
  console.log(`📊 Build Summary`);
  console.log(`================================================================================`);
  
  let allSuccessful = true;
  for (const res of results) {
    const statusSymbol = res.success ? '✅' : '❌';
    const statusText = res.success ? 'Success' : `Failed (${res.error})`;
    console.log(`${statusSymbol}  ${res.appName.padEnd(30)}: ${statusText.padEnd(25)} (${res.duration}s)`);
    if (!res.success) {
      allSuccessful = false;
    }
  }
  console.log(`================================================================================`);

  if (allSuccessful) {
    console.log(`🎉 All builds completed successfully!`);
    process.exit(0);
  } else {
    console.error(`💥 One or more builds failed. Check logs above.`);
    process.exit(1);
  }
}

runBuilds();
