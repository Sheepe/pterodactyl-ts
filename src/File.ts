
import { FileManager, FileList } from "./FileManager";
import { Client } from "./Client";
import { APIRequest } from "./Request";
import { PterodactylAPIError } from "./PterodactylAPIError";
import { Server } from "./Server";
import { report } from "process";

export type FileAccess = {
    read: boolean
    write: boolean
    execute: boolean
}

export type FileData = {
    object: "file_object"
    attributes: {
        name: string
        mode: string
        size: number
        is_file: boolean
        is_symlink: boolean
        is_editable: boolean
        mimetype: string
        created_at: string
        modified_at: string
    }
}

/**
 * @author Sheepe
 * @class
 * @classdesc Interface for a file on the server
 */
export class File {

    /**
     * The name of the file
     */
    public readonly name: string
    /**
     * Details the file access for those with an owner access level
     */
    public readonly ownerFileAccess: FileAccess
    /**
     * Details the file access for those with a user access level
     */
    public readonly userFileAccess: FileAccess
    /**
     * Whether or not the file is a directory
     */
    public readonly isDirectory: boolean
    /**
     * The size of the file in bytes
     */
    public readonly size: number
    /**
     * The system link for the file
     */
    public readonly symlink: boolean
    /**
     * Whether or not the file is editable
     */
    public readonly editable: boolean
    /**
     * The mime type of the file
     */
    public readonly mimeType: string
    /**
     * The date the file was created
     */
    public readonly createdAt: Date
    /**
     * The date the file was last modified
     */
    public readonly modifiedAt: Date
    /**
     * The date the file was last fetched from the database
     */
    public readonly fetchedAt: Date
    /**
     * The current location of the file
     */
    public readonly location: string
    /**
     * The parent location of the file
     */
    public readonly root: string
    /**
     * The server the file belongs to
     */
    public readonly server: Server

    private readonly mode: string

    constructor(data: FileData, server: Server, parent = "") {

        if (parent.endsWith("/")) {
            parent = parent.slice(0, -1)
        }

        const attributes = data.attributes

        this.name = attributes.name
        this.size = attributes.size
        this.symlink = attributes.is_symlink
        this.editable = attributes.is_editable
        this.mimeType = attributes.mimetype
        this.mode = attributes.mode
        this.location = parent + "/" + attributes.name
        this.root = parent.length === 0 ? "/" : parent
        this.fetchedAt = new Date(Date.now())

        const flag = attributes.mode.charAt(0)
        const ownerPerms = attributes.mode.substr(1, 3)
        const userPerms = attributes.mode.substr(4, 3)

        this.isDirectory = (flag === "d")

        this.ownerFileAccess = {
            read: (ownerPerms.charAt(0) === "r"),
            write: (ownerPerms.charAt(1) === "w"),
            execute: (ownerPerms.charAt(2) === "x")
        }

        this.userFileAccess = {
            read: (userPerms.charAt(0) === "r"),
            write: (userPerms.charAt(1) === "w"),
            execute: (userPerms.charAt(2) === "x")
        }

        this.createdAt = new Date(attributes.created_at)

        if (attributes.modified_at === null) {
            this.modifiedAt = null
        } else {
            this.modifiedAt = new Date(attributes.modified_at)
        }

        this.server = server
    }

    /**
     * Gets the children of the file if it is a directory.
     * Otherwise, it throws an error.
     * @async
     * @returns List of file objects
     */
    async getChildren(): Promise<File[]> {

        if (!this.isDirectory) {
            throw new PterodactylAPIError("This file is not a directory, you cannot get it's children!")
        }

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + this.location,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        let result = []

        for (const file of response.data.data) {
            result.push(new File(file, this.server, this.location))
        }

        return result
    }

    /**
     * Gets the inner contents of the file if it is NOT a directory.
     * Can fail if the file contents are too large.
     * @async
     * @returns The contents of the file
     */
    async getContents(): Promise<string> {

        if (this.isDirectory) {
            throw new PterodactylAPIError("A directory has no file contents, did you mean getChildren?")
        }

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/contents?file=" + this.location,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        return response.data
    }

    /**
     * Returns a child of the file, only if it is a directory
     * @async
     * @param name The name of the child
     * @returns The child if it exists
     */
    async getChild(name: string): Promise<File> {

        let files = await this.getChildren()

        for (const file of files) {
            if (file.name === name) {
                return file
            }
        }
    }

    /**
     * Gets a one-time-use download link for the file
     * Only works for files, to download a directory, compress it first.
     * @async
     * @returns Link to download the file
     */
    async download(): Promise<string> {

        if (this.isDirectory) {
            throw new PterodactylAPIError("You cannot download a directory directly. Try compressing it first")
        }

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/download?file=" + this.location,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        return response.data.attributes.url
    }

    /**
     * Renames the file
     * @async
     * @param name The new name of the file
     * @returns The new file
     */
    async rename(name: string): Promise<File> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response0 = await APIRequest({
            method: "put",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/rename",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                root: this.root,
                files: [
                    {
                        from: this.name,
                        to: name
                    }
                ]
            }
        }, [204])

        const response1 = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + this.root,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        for (const file of response1.data.data) {
            if (file.attributes.name === name) {
                return new File(file, this.server, this.root)
            }
        }

        throw new PterodactylAPIError("Unable to complete the operation")
    }

    /**
     * Re-syncs the file object with the server
     * @async 
     * @returns The new file
     */
    async sync(): Promise<File> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response1 = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/list?directory=" + this.root,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            }
        })

        for (const file of response1.data.data) {
            if (file.attributes.name === this.name) {
                return new File(file, this.server, this.root)
            }
        }

        throw new PterodactylAPIError("Unable to find the file, has it been renamed?")
    }

    /**
     * Duplicates the file into a location with a new name
     * @async
     * @param toLocation The location to duplicate it into
     * @param newName The new name of the file
     * @returns Always true, otherwise it throws an error
     */
    async duplicate(toLocation: string, newName = ""): Promise<boolean> {

        if (toLocation.endsWith("/")) {
            toLocation = toLocation.slice(0, -1)
        }

        const client = this.server.client
        const copyName = (newName.length === 0 ? this.name : newName)

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response0 = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/copy",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                location: toLocation + "/" + copyName
            }
        }, [204])

        return true
    }

    /**
     * Writes to the file contents if it is NOT a directory
     * Otherwise it will throw an error. Use `file.writeChild()` instead.
     * @async
     * @param contents The new contents of the file
     * @param path If provided, and is not the current file, will create a new file at the path (or overwrite an existing one) with the provided contents.
     * @returns The updated (or new) file
     */
    async write(contents: string, path?: string): Promise<File> {

        if (this.isDirectory) {
            throw new PterodactylAPIError("A directory has no file contents, did you mean writeChild?")
        }

        let base = this.root

        if (base.endsWith("/")) {
            base = base.slice(0, -1)
        }

        if (path === undefined) {
            path = base + "/" + this.name
        } else {
            if (path.startsWith("/")) {
                path = path.slice(1)
            }

            path = base + "/" + path
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

    /**
     * Updates or creates a new file inside of a directory at a path with provided contents
     * @async
     * @param contents The new contents of the file
     * @param path The path of the file
     * @returns The new or updated file
     */
    async writeChild(contents: string, path: string): Promise<File> {

        if (!this.isDirectory) {
            throw new PterodactylAPIError("This is a file, not a directory. You cannot add or edit a child from it.")
        }

        let base = this.location

        if (base.endsWith("/")) {
            base = base.slice(0, -1)
        }

        if (path.startsWith("/")) {
            path = path.slice(1)
        }

        path = base + "/" + path

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

    /**
     * Creates a new directory in the location of the current file with the provided name
     * @async
     * @param name The name of the new directory
     * @param location The location of the new directory. Default is '/'
     * @returns The new directory file object
     */
    async addDirectory(name: string, location = "/"): Promise<File> {

        if (location.endsWith("/")) {
            location = location.slice(0, -1)
        }

        if (this.isDirectory) {
            location = this.location + location
        } else {
            location = this.root + location
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
     * Compresses the file
     * @async
     * @returns The newly compressed file
     */
    async compress(): Promise<File> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/compress",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                root: this.root,
                files: [
                    this.name
                ]
            }
        })

        return new File(response.data, this.server, this.root)
    }

    /**
     * Decompresses the file.
     * If it cannot be decompressed, this will throw an error.
     * @async
     * @param deleteSelf Whether to delete this file object after decompressing. Default is false.
     * @returns Always true, otherwise it will throw an error.
     */
    async decompress(deleteSelf = false): Promise<boolean> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/decompress",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                root: this.root,
                file: this.name
            }
        }, [204])

        this.delete()

        return true
    }

    /**
     * Deletes the file
     * @async
     * @returns Always true, otherwise it will throw an error.
     */
    async delete(): Promise<boolean> {

        const client = this.server.client

        if (!client.verified) throw new PterodactylAPIError(client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: client.host + "/api/client/servers/" + this.server.identifier + "/files/delete",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + client.token
            },
            data: {
                root: this.root,
                files: [
                    this.name
                ]
            }
        }, [204])

        return true
    }
}