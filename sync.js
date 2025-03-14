/**
 * Web Tools Box Sync Script
 * 
 * This script synchronizes files between the project root and the web-tools-box directory
 * while respecting patterns in a .syncignore file.
 * 
 * - Uses only Node.js built-in modules
 * - Supports .syncignore file with gitignore-style patterns
 * - Compares files and directories with efficient algorithms
 * - Handles file creation, updating, and deletion
 * 
 * Usage:
 * - node sync.js             : Run sync once
 * - node sync.js --auto      : Watch for changes and auto-sync (500ms debounce)
 * - node sync.js --auto -300 : Watch for changes with custom debounce time (300ms)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SOURCE_DIR = path.resolve(__dirname); // Project root directory
const TARGET_DIR = path.join(SOURCE_DIR, 'web-tools-box'); // Target directory
const IGNORE_FILE = '.syncignore';
const CHUNK_SIZE = 64 * 1024; // 64KB chunks for file comparison
const DEFAULT_DEBOUNCE_TIME = 500; // Default debounce time in ms

/**
 * Main function to synchronize directories
 */
async function syncDirectories() {
    console.log('Starting synchronization...');
    console.log(`Source: ${SOURCE_DIR}`);
    console.log(`Target: ${TARGET_DIR}`);

    // Read ignore patterns
    const ignorePatterns = readIgnorePatterns();
    console.log(`Loaded ${ignorePatterns.length} ignore patterns`);

    // Create target directory if it doesn't exist
    if (!fs.existsSync(TARGET_DIR)) {
        console.log('Target directory does not exist, creating it...');
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Perform the sync
    const stats = await synchronize(SOURCE_DIR, TARGET_DIR, '', ignorePatterns);

    // Print summary
    console.log('\nSynchronization completed!');
    console.log(`Added: ${stats.added} files/directories`);
    console.log(`Updated: ${stats.updated} files`);
    console.log(`Removed: ${stats.removed} files/directories`);
    console.log(`Unchanged: ${stats.unchanged} files/directories`);
    
    return stats;
}

/**
 * Read and parse the .syncignore file
 * @returns {string[]} Array of ignore patterns
 */
function readIgnorePatterns() {
    const ignoreFilePath = path.join(SOURCE_DIR, IGNORE_FILE);
    let patterns = [];

    // Add the target directory to ignored patterns to prevent recursive copying
    patterns.push('web-tools-box/**');
    patterns.push('web-tools-box/');

    // Read .syncignore file if it exists
    if (fs.existsSync(ignoreFilePath)) {
        try {
            const content = fs.readFileSync(ignoreFilePath, 'utf8');
            const lines = content.split('\n').map(line => line.trim());
            
            // Add non-empty lines that don't start with #
            for (const line of lines) {
                if (line && !line.startsWith('#')) {
                    patterns.push(line);
                }
            }
        } catch (err) {
            console.error(`Error reading ${IGNORE_FILE}:`, err.message);
        }
    } else {
        console.log(`No ${IGNORE_FILE} file found, using default ignore patterns`);
    }

    return patterns;
}

/**
 * Convert a gitignore pattern to a RegExp
 * @param {string} pattern - The gitignore pattern
 * @returns {RegExp} A RegExp to test against file paths
 */
function patternToRegExp(pattern) {
    // Remove leading and trailing slashes and spaces
    pattern = pattern.trim().replace(/^\/+|\/+$/g, '');
    
    // If pattern starts with !, it's a negation (not supported in this basic implementation)
    const isNegation = pattern.startsWith('!');
    if (isNegation) pattern = pattern.substring(1);
    
    // Handle directory-only pattern
    const isDirOnly = pattern.endsWith('/');
    if (isDirOnly) pattern = pattern.substring(0, pattern.length - 1);
    
    // Convert gitignore glob pattern to RegExp
    let regexPattern = pattern
        // Escape regexp special chars except * and ?
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') 
        // Convert ** to special placeholder
        .replace(/\*\*/g, '__DOUBLE_STAR__')
        // Convert * to single part match
        .replace(/\*/g, '[^/]*')
        // Convert ? to single char match
        .replace(/\?/g, '[^/]')
        // Restore ** as any part including separators
        .replace(/__DOUBLE_STAR__/g, '.*');
        
    // Prepare the final regex
    const regex = new RegExp(`^${regexPattern}${isDirOnly ? '(?:/.*)?$' : '$'}`);
    
    return { pattern: regex, negate: isNegation };
}

/**
 * Check if a path should be ignored based on ignore patterns
 * @param {string} relativePath - The relative path to check
 * @param {string[]} patterns - The ignore patterns
 * @param {boolean} isDirectory - Whether the path is a directory
 * @returns {boolean} True if the path should be ignored
 */
function shouldIgnore(relativePath, patterns, isDirectory) {
    if (!patterns || patterns.length === 0) {
        return false;
    }

    // Normalize the path for comparison
    relativePath = relativePath.replace(/\\/g, '/');
    
    // Add trailing slash for directories for pattern matching
    if (isDirectory && !relativePath.endsWith('/')) {
        relativePath += '/';
    }

    // Simple matching function that handles basic gitignore patterns
    for (const pattern of patterns) {
        // Direct match
        if (pattern === relativePath) return true;
        
        // Target directory should be ignored
        if (relativePath.startsWith('web-tools-box/')) return true;
        
        // Check if the pattern includes wildcards
        if (pattern.includes('*') || pattern.includes('?')) {
            const regexpObj = patternToRegExp(pattern);
            if (regexpObj.pattern.test(relativePath)) {
                return !regexpObj.negate;
            }
        } else if (relativePath.startsWith(pattern)) {
            // If pattern doesn't have wildcards, check if it's a prefix
            return true;
        }
    }

    return false;
}

/**
 * Compute hash of a file for efficient comparison
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} Hash of the file content
 */
async function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
        
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', error => reject(error));
    });
}

/**
 * Compare two files to check if they are identical
 * @param {string} file1 - Path to first file
 * @param {string} file2 - Path to second file
 * @returns {Promise<boolean>} True if files are identical
 */
async function areFilesIdentical(file1, file2) {
    // First check file sizes
    const stat1 = fs.statSync(file1);
    const stat2 = fs.statSync(file2);
    
    if (stat1.size !== stat2.size) {
        return false;
    }
    
    // If sizes are equal, compare file hashes
    try {
        const hash1 = await getFileHash(file1);
        const hash2 = await getFileHash(file2);
        return hash1 === hash2;
    } catch (error) {
        console.error(`Error comparing files ${file1} and ${file2}:`, error.message);
        return false;
    }
}

/**
 * Synchronize source and target directories
 * @param {string} sourceDir - Source directory path
 * @param {string} targetDir - Target directory path
 * @param {string} relativePath - Current relative path
 * @param {string[]} ignorePatterns - Patterns to ignore
 * @returns {Object} Statistics of sync operations
 */
async function synchronize(sourceDir, targetDir, relativePath, ignorePatterns) {
    const stats = { added: 0, updated: 0, removed: 0, unchanged: 0 };
    
    // Get source files and directories
    const sourceItems = fs.existsSync(path.join(sourceDir, relativePath)) 
        ? fs.readdirSync(path.join(sourceDir, relativePath), { withFileTypes: true })
        : [];
    
    // Get target files and directories
    const targetItems = fs.existsSync(path.join(targetDir, relativePath))
        ? fs.readdirSync(path.join(targetDir, relativePath), { withFileTypes: true })
        : [];
    
    // Convert target items to a map for easier lookup
    const targetMap = new Map();
    targetItems.forEach(item => {
        targetMap.set(item.name, item);
    });
    
    // Process source items (copy/update)
    for (const sourceItem of sourceItems) {
        const itemRelPath = path.join(relativePath, sourceItem.name).replace(/\\/g, '/');
        
        // Skip if the item should be ignored
        if (shouldIgnore(itemRelPath, ignorePatterns, sourceItem.isDirectory())) {
            console.log(`Skipping (ignored): ${itemRelPath}`);
            continue;
        }
        
        // Create full paths
        const sourceItemPath = path.join(sourceDir, itemRelPath);
        const targetItemPath = path.join(targetDir, itemRelPath);
        
        // Check if the item exists in target
        const targetItem = targetMap.get(sourceItem.name);
        
        if (sourceItem.isDirectory()) {
            // Handle directory
            if (!targetItem) {
                // Create directory if it doesn't exist
                fs.mkdirSync(targetItemPath, { recursive: true });
                console.log(`Created directory: ${itemRelPath}`);
                stats.added++;
            } else if (!targetItem.isDirectory()) {
                // Remove file and create directory
                fs.unlinkSync(targetItemPath);
                fs.mkdirSync(targetItemPath, { recursive: true });
                console.log(`Replaced file with directory: ${itemRelPath}`);
                stats.updated++;
            } else {
                stats.unchanged++;
            }
            
            // Recursively synchronize subdirectory
            const subStats = await synchronize(
                sourceDir, 
                targetDir, 
                itemRelPath, 
                ignorePatterns
            );
            
            // Combine statistics
            stats.added += subStats.added;
            stats.updated += subStats.updated;
            stats.removed += subStats.removed;
            stats.unchanged += subStats.unchanged;
        } else {
            // Handle file
            if (!targetItem) {
                // Copy file if it doesn't exist
                fs.copyFileSync(sourceItemPath, targetItemPath);
                console.log(`Added file: ${itemRelPath}`);
                stats.added++;
            } else if (targetItem.isDirectory()) {
                // Remove directory and copy file
                fs.rmSync(targetItemPath, { recursive: true, force: true });
                fs.copyFileSync(sourceItemPath, targetItemPath);
                console.log(`Replaced directory with file: ${itemRelPath}`);
                stats.updated++;
            } else {
                // Check if files are identical
                const identical = await areFilesIdentical(sourceItemPath, targetItemPath);
                if (!identical) {
                    // Update file if they're different
                    fs.copyFileSync(sourceItemPath, targetItemPath);
                    console.log(`Updated file: ${itemRelPath}`);
                    stats.updated++;
                } else {
                    stats.unchanged++;
                }
            }
        }
        
        // Remove processed item from target map
        targetMap.delete(sourceItem.name);
    }
    
    // Remove items that exist in target but not in source
    for (const [name, item] of targetMap.entries()) {
        const itemRelPath = path.join(relativePath, name).replace(/\\/g, '/');
        const targetItemPath = path.join(targetDir, itemRelPath);
        
        // Skip if the item should be ignored
        if (shouldIgnore(itemRelPath, ignorePatterns, item.isDirectory())) {
            console.log(`Skipping removal of ignored item: ${itemRelPath}`);
            continue;
        }
        
        if (item.isDirectory()) {
            // Remove directory
            fs.rmSync(targetItemPath, { recursive: true, force: true });
            console.log(`Removed directory: ${itemRelPath}`);
        } else {
            // Remove file
            fs.unlinkSync(targetItemPath);
            console.log(`Removed file: ${itemRelPath}`);
        }
        
        stats.removed++;
    }
    
    return stats;
}

/**
 * Watch for file changes in the source directory
 * @param {number} debounceTime - Debounce time in milliseconds
 */
function watchDirectory(debounceTime) {
    const ignorePatterns = readIgnorePatterns();
    let timeoutId = null;
    let isProcessing = false;
    
    console.log(`Watching for changes with ${debounceTime}ms debounce time...`);
    console.log('Press Ctrl+C to stop.');

    // Setup recursive watching
    function setupWatcher(dirPath) {
        try {
            // Watch current directory
            fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
                if (!filename) return;
                
                const relativePath = path.relative(SOURCE_DIR, dirPath).replace(/\\/g, '/');
                const fullRelativePath = path.join(relativePath, filename).replace(/\\/g, '/');
                
                // Check if the file/dir should be ignored
                const fullPath = path.join(dirPath, filename);
                const isDir = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
                
                if (shouldIgnore(fullRelativePath, ignorePatterns, isDir)) {
                    return;
                }
                
                console.log(`Change detected: ${fullRelativePath}`);
                
                // Debounce logic
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                timeoutId = setTimeout(async () => {
                    if (isProcessing) return;
                    
                    isProcessing = true;
                    try {
                        await syncDirectories();
                    } catch (error) {
                        console.error('Error during synchronization:', error);
                    } finally {
                        isProcessing = false;
                    }
                }, debounceTime);
            });
            
            // Setup watchers for subdirectories
            if (fs.existsSync(dirPath)) {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (!entry.isDirectory()) continue;
                    
                    const entryPath = path.join(dirPath, entry.name);
                    const relPath = path.relative(SOURCE_DIR, entryPath).replace(/\\/g, '/');
                    
                    if (shouldIgnore(relPath, ignorePatterns, true)) {
                        continue;
                    }
                    
                    setupWatcher(entryPath);
                }
            }
        } catch (error) {
            console.error(`Error setting up watcher for ${dirPath}:`, error);
        }
    }
    
    // Start watching from source directory
    setupWatcher(SOURCE_DIR);
}

/**
 * Parse command line arguments and run the appropriate mode
 */
function parseArgsAndRun() {
    const args = process.argv.slice(2);
    
    // Check if auto mode is enabled
    const autoIndex = args.indexOf('--auto');
    
    if (autoIndex !== -1) {
        // Auto mode enabled, check for custom debounce time
        let debounceTime = DEFAULT_DEBOUNCE_TIME;
        
        // Look for a parameter starting with -
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-') && args[i] !== '--auto') {
                const timeValue = parseInt(args[i].substring(1), 10);
                if (!isNaN(timeValue) && timeValue > 0) {
                    debounceTime = timeValue;
                    break;
                }
            }
        }
        
        // Run initial sync
        syncDirectories().then(() => {
            // Then start watching for changes
            watchDirectory(debounceTime);
        }).catch(error => {
            console.error('Error during initial synchronization:', error);
            process.exit(1);
        });
    } else {
        // Standard one-time sync
        syncDirectories().catch(error => {
            console.error('Error during synchronization:', error);
            process.exit(1);
        });
    }
}

// Run the script
parseArgsAndRun();