
import { FileData, File } from "./File";
import { Server } from "./Server";
import { PterodactylAPIError } from "./PterodactylAPIError";
import { APIRequest } from "./Request";

export type FileList = {
    object: "list"
    data: FileData[]
}

/**
 * @author Sheepe
 * @class
 * @classdesc The base interface for managing files on the server
 */
export class FileManager {

    /**
     * The files in the root directory of the server
     */
    public contents: File[] = []

    private readonly server: Server

    constructor(contents: FileList, server: Server) {

        const data = contents.data

        for (const file of data) {
            this.contents.push(new File(file, server))
        }

        this.server = server
    }

    /**
     * Gets the child with the provided name if it exists
     * @param name 
     * @returns The file if it exists
     */
    getChild(name: string): File {

        for (const file of this.contents) {
            if (file.name === name) {
                return file
            }
        }
    }

    /**
     * Gets the file contents at a path (only works if it is NOT a directory)
     * If a directory, will throw an error.
     * @async 
     * @param path The path to get the file contents of
     * @returns The contents of the file
     */
    async getFileContents(path: string): Promise<string> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/contents?file=" + path,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        return response.data
    }

    /**
     * Gets the contents of a directory
     * If not a directory, will throw an error.
     * @async
     * @param path 
     * @returns List of file objects
     */
    async getFolderContents(path: string): Promise<File[]> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + path,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        let result = []

        for (const file of response.data.data) {
            result.push(new File(file, this.server))
        }

        return result
    }

    /**
     * Updates or creates a file at a location with specified contents
     * @async
     * @param contents The new contents of the file
     * @param path The path of the file to update or create
     * @returns The newly updated or created file
     */
    async writeFile(contents: string, path: string): Promise<File> {

        if (path.startsWith("/")) {
            path = path.slice(1)
        }

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response0 = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/write?file=" + path,
            headers: {
                "Accept": "application/json",
                "Content-Type": "text/plain",
                "Authorization": "Bearer " + client.token
            },
            data: contents
        }, [204])

        let pathList = path.split("/")
        const name = pathList.pop()
        const root = pathList.join("/")

        const response1 = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + root,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        for (const file of response1.data.data) {
            if (file.attributes.name === name) {
                return new File(file, this.server, root)
            }
        }
    }

    async addDirectory(name: string, location = "/"): Promise<File> {

        if (location.length > 1) {
            if (location.endsWith("/")) {
                location = location.slice(0, -1)
            }
        }

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response0 = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/create-folder?file=" + location + "/" + name,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                root: location,
                name: name
            }
        }, [204])

        const response1 = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + location,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        for (const file of response1.data.data) {
            if (file.attributes.name === name) {
                return new File(file, this.server, location)
            }
        }
    }

    /**
     * Re-syncs the file manager with the server if any files have been changed
     * @async
     * @returns A newly synced file manager
     */
    async sync(): Promise<FileManager> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        this.contents = []

        const data = response.data.data

        for (const file of data) {
            this.contents.push(new File(file, this.server))
        }

        return this
    }
}