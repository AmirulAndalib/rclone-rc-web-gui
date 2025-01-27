import { rcloneSettings } from "./settings.js";

export const asyncOperations: string[] = [
    "/sync/copy",
    "/sync/move",
    "/operations/purge",
    "/operations/copyfile",
    "/operations/movefile",
    "/operations/deletefile"
]

export const panelsPaths: {[key: string]: string} = {
    "leftPanelFiles": "",
    "rightPanelFiles": ""
}

export type rcListItem =
{
    Path: string,
    Name: string,
    Size: number,
    MimeType: string,
    ModTime: Date,
    IsDir: boolean
}

export type rcTransfer =
{
    error: string,
    name: string,
    size: number,
    bytes: number,
    checked: boolean,
    started_at: Date,
    completed_at: Date,
    group: string,
    speed: number,
    percentage: number
}

export type rcVersion = {
    arch: string,
    decomposed: number[],
    goTags: string,
    goVersion: string,
    isBeta: boolean,
    isGit: boolean,
    linking: string,
    os: string,
    version: string
}

export type rcAbout = {
    free: number,
    total: number,
    used: number
}

export type rcRemotes = {
    remotes: string[]
}

export type rcRequest = {
    _async?: boolean,
    remote?: string,
    jobid?: string,
    fs?: string,
    srcFs?: string,
    srcRemote?: string,
    dstFs?: string,
    dstRemote?: string,
    deleteEmptySrcDirs?: boolean
}

export type rcStats = {
    bytes: number,
    checks: number,
    deletedDirs: number,
    deletes: number,
    elapsedTime: number,
    errors: number,
    eta: number,
    fatalError: boolean,
    lastError: string,
    renames: number,
    retryError: boolean,
    speed: number,
    totalBytes: number,
    totalChecks: number,
    totalTransfers: number,
    transferTime: number,
    transfers: number,
    transferring: rcTransfer[]
}

export function sendRequestToRclone(query: string, params: rcRequest | null, fn: Function)
{
    let url = rcloneSettings.host.concat(query);
    let xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (rcloneSettings.loginToken !== null)
    {
        xhr.setRequestHeader(
            "Authorization",
            `Basic ${rcloneSettings.loginToken}`
        );
    }
    else if (rcloneSettings.user !== null && rcloneSettings.pass !== null)
    {
        xhr.setRequestHeader(
            "Authorization",
            `Basic ${btoa(rcloneSettings.user.concat(":", rcloneSettings.pass))}`
        );
    }

    // console.group("Command:", query);
    // console.debug("URL:", url);
    if (params === null) { xhr.send(); }
    else
    {
        if (asyncOperations.includes(query))
        {
            params["_async"] = true;
        }
        // console.debug("Parameters: ", params);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(params));
    }
    // console.groupEnd();

    xhr.onload = function()
    {
        if (xhr.status != 200)
        {
            console.group("Request has failed");
            console.error("Error, HTTP status code:", xhr.status);
            if (xhr.status === 500)
            {
                let rezError = JSON.parse(xhr.response)["error"];
                if (rezError !== undefined && rezError !== null)
                {
                    console.error(rezError);
                    //alert("rclone reported an error. Check console for more details");
                }
            }
            console.groupEnd();
            fn(null);
        }
        else
        {
            //console.debug(xhr.response);
            fn(JSON.parse(xhr.response));
        }
    };

    xhr.onerror = function()
    {
        console.error("Couldn't send the request");
    };
}

export const debounce = <F extends (...args: any[]) => any>
    (func: F, waitFor: number) => {
    let timeout = 0;

    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) { clearTimeout(timeout); }
            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
}

export function htmlToElement(html: string) : HTMLElement
{
    let template: HTMLTemplateElement = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
}

export function getIconType(mimeType: string) : string
{
    switch (mimeType)
    {
        case "inode/directory":
            return "folder.svg";
        case "video/x-matroska":
        case "video/mp4":
        case "video/webm":
            return "film.svg";
        case "audio/aac":
        case "audio/mpeg":
        case "audio/ac3":
        case "audio/flac":
            return "music-note-beamed.svg";
        case "image/jpeg":
        case "image/png":
        case "image/svg+xml":
            return "image.svg";
        case "text/srt; charset=utf-8":
        case "text/plain":
        case "text/plain; charset=utf-8":
            return "file-text.svg";
        case "application/pdf":
            return "file-richtext.svg";
        case "application/json":
        case "application/javascript":
        case "text/css":
        case "text/css; charset=utf-8":
        case "text/html":
        case "text/html; charset=utf-8":
            return "file-code.svg";
        case "application/zip":
        case "application/x-7z-compressed":
        case "application/gzip":
            return "file-zip.svg";
        default:
            return "file-earmark.svg";
    }
}

export function getHumanReadableValue(sizeInBytes: number, metric: string) : string
{
    let rez: string = "0";
    let metricRank: string = "MB";
    let sizeInMB: number = sizeInBytes / 1024 / 1024;
    let sizeInGB: number = sizeInMB / 1024;
    if (sizeInGB < 1)
    {
        rez = sizeInMB.toFixed(2);
    }
    else
    {
        metricRank = "GB";
        rez = sizeInGB.toFixed(2);
    }
    return `${rez} ${metricRank}${metric}`;
}

// TODO: sort jobs with the same group (items from a folder transfer are sorted in the "wrong" order)
export function sortJobs(a: rcTransfer, b: rcTransfer) : number
{
    if (a.group === undefined || b.group === undefined) { return 0; }

    var jobA = Number(
        a.group.substring(
            a.group.lastIndexOf("/") + 1,
            a.group.length
        )
    );
    var jobB = Number(
        b.group.substring(
            b.group.lastIndexOf("/") + 1,
            b.group.length
        )
    );
    if (jobA < jobB) { return -1; }
    else { return 1; }
}

export function sortFilesAndFolders(a: rcListItem, b: rcListItem) : number
{
    if (a.IsDir === true && b.IsDir === false) { return -1; }
    if (a.IsDir === false && b.IsDir === true) { return 1; }
    return 0;
}

export function getDestinationPath(currentFilePanel: string) : string
{
    if (currentFilePanel === "leftPanelFiles") { return panelsPaths["rightPanelFiles"]; }
    else { return panelsPaths["leftPanelFiles"]; }
}

export function panelsPathsHaveValue() : boolean
{
    if (panelsPaths["leftPanelFiles"] === "" || panelsPaths["rightPanelFiles"] === "")
    {
        return false;
    }
    else { return true; }
}

export function getFolderOperation(operationType: string) : string
{
    switch (operationType)
    {
        case "copy":
            return "/sync/copy";
        case "move":
            return "/sync/move";
        case "delete":
            return "/operations/purge";
        default:
            return "";
    }
}

export function getFileOperation(operationType: string) : string
{
    switch (operationType)
    {
        case "copy":
            return "/operations/copyfile";
        case "move":
            return "/operations/movefile";
        case "delete":
            return "/operations/deletefile";
        default:
            return "";
    }
}

export function acceptableKeyEventForSearch(ke: KeyboardEvent) : boolean
{
    if (
        (ke.keyCode > 64 && ke.keyCode < 91)
        ||
        (ke.keyCode > 96 && ke.keyCode < 123)
        ||
        (ke.keyCode === 8 || (ke.keyCode === 8 && ke.ctrlKey)) // backspace // the `(ke.keyCode === 8 && ke.metaKey)` works only with `keydown`, and also `metaKey` doesn't seem to be a modifier?
        ||
        (ke.keyCode === 46 || (ke.keyCode === 46 && ke.ctrlKey)) // delete // the `(ke.keyCode === 46 && ke.metaKey)` works only with `keydown`, and also `metaKey` doesn't seem to be a modifier?
    )
    { return true; } else { return false; }
}
