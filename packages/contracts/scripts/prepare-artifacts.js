const fs = require("fs");
const path = require("path");
const glob = require("glob");

const sourceDir = "artifacts/contracts";
const distDir = "dist/artifacts/contracts";

// Function to copy a file
function copyFile(source, destination) {
    fs.copyFileSync(source, destination);
    // console.log(`Copied ${source} to ${destination}`);
}

// Define the exclusion patterns
const excludePatterns = ["**/*dbg.json", "**/TestContracts/**/*.*", "**/ZERO/ZERO*/*.*"];

// Glob all .json files in the source directory and its subdirectories
glob(`${sourceDir}/**/*.json`, { ignore: excludePatterns }, (err, files) => {
    if (err) {
        console.error("Error globbing .json files:", err);
        process.exit(1);
    }

    files.forEach((file) => {
        const relativePath = path.relative(sourceDir, file);
        const destinationPath = path.join(distDir, relativePath);

        const destinationDirectory = path.dirname(destinationPath);
        if (!fs.existsSync(destinationDirectory)) {
            fs.mkdirSync(destinationDirectory, { recursive: true });
        }

        copyFile(file, destinationPath);
    });
});
