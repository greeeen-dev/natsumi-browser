/*

Natsumi Browser - Welcome to your personal internet.

Copyright (c) 2024-present Green (@greeeen-dev)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const allowedFileTypes = ["image", "audio"];
const whitelistedFileTypes = ["application/ogg"];
const blacklistedFileTypes = ["audio/flac"];
const uploadsPath = PathUtils.join(PathUtils.profileDir, "natsumi-uploads");

export class NatsumiFile {
    constructor(name, filetype, data) {
        // Sanity check first
        const detectedFileType = getFileType(data);
        if (detectedFileType !== filetype) {
            throw new Error(
                `Expected filetype ${filetype}, got ${detectedFileType}. You probably just lost your file. Congratulations.`
            )
        }

        this.name = name;
        this.filetype = filetype;
        this.data = data;
    }
}

function getFileData(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.addEventListener("load", () => {
            // Check if filetype is blacklisted
            for (const blacklistedType of blacklistedFileTypes) {
                if (reader.result.startsWith(`data:${blacklistedType};`)) {
                    reject("Filetype not allowed");
                    return;
                }
            }

            let hasAllowedType = false;
            for (const allowedType of allowedFileTypes) {
                if (reader.result.startsWith(`data:${allowedType}/`)) {
                    hasAllowedType = true;
                    break;
                }
            }

            if (!hasAllowedType) {
                // Try to check if we have a whitelisted file type
                for (const whitelistedType of whitelistedFileTypes) {
                    if (reader.result.startsWith(`data:${whitelistedType};`)) {
                        hasAllowedType = true;
                        break;
                    }
                }

                if (!hasAllowedType) {
                    reject("Filetype not allowed");
                }
            }

            resolve(reader.result);
        });

        reader.readAsDataURL(file);

        setTimeout(() => {
            reject("Upload timed out");
        }, 30000);
    });
}

function getFileType(dataString) {
    let fileType = dataString.split(";", 1)[0];

    if (!fileType.startsWith("data:")) {
        throw new Error("Invalid base64 string");
    }

    return fileType.slice(5);
}

function testFileId(fileId) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId);
}

export async function uploadFile(file) {
    const fileId = self.crypto.randomUUID();
    const fileName = file.name;
    const fileData = await getFileData(file);
    const fileType = getFileType(fileData);

    // Compile data to dict
    const fileDict = {
        "name": fileName,
        "type": fileType,
        "data": fileData
    }

    // Save file
    await IOUtils.makeDirectory(uploadsPath, {
        createAncestors: false,
    });

    const filePath = PathUtils.join(uploadsPath, `${fileId}.json`);
    await IOUtils.writeJSON(filePath, fileDict);
    return fileId;
}

export async function getFile(fileId) {
    if (!testFileId(fileId)) {
        throw new Error("Invalid file ID");
    }

    await IOUtils.makeDirectory(uploadsPath, {
        createAncestors: false,
    });

    const filePath = PathUtils.join(uploadsPath, `${fileId}.json`);

    // Read file data
    const fileDict = await IOUtils.readJSON(filePath);

    // Return object
    return new NatsumiFile(fileDict["name"], fileDict["type"], fileDict["data"]);
}

export async function deleteFile(fileId) {
    if (!testFileId(fileId)) {
        throw new Error("Invalid file ID");
    }

    const filePath = PathUtils.join(uploadsPath, `${fileId}.json`);
    await IOUtils.remove(filePath, { ignoreAbsent: true });
}
