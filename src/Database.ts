import { Client } from "./Client"
import { APIRequest } from "./Request"
import { Server } from "./Server"
import { PterodactylAPIError } from "./PterodactylAPIError"

type DatabasePasswordData = {
    object: "database_password"
    attributes: {
        password: string
    }
}

class DatabasePassword {

    public readonly value: string

    constructor(data: DatabasePasswordData) {
        this.value = data.attributes.password
    }

    toString(): string {
        return this.value
    }
}

export type DatabaseData = {
    object: "server_database"
    attributes: {
        id: string
        host: {
            address: string
            port: number
        }
        name: string
        username: string
        connections_from: string
        max_connections: number
        relationships?: {
            password?: DatabasePasswordData
        }
    }
}

/**
 * @author Sheepe
 * @class
 * @classdesc An object for interfacing with a database
 */
export class Database {

    /**
     * The identifier of the database
     */
    public readonly id: string
    /**
     * The address of the database
     */
    public readonly address: string
    /**
     * The port of the database
     */
    public readonly port: number
    /**
     * The name of the database
     */
    public readonly name: string
    /**
     * The username used to access the database
     */
    public readonly username: string
    /**
     * IPs that are allowed to connect to the database
     */
    public readonly connectionsFrom: string
    /**
     * Maximum number of connections to the database
     */
    public readonly maxConnections: number
    
    /**
     * The server the database belongs to
     */
    public readonly server: Server
    /**
     * The client used to access the database
     */
    public readonly client: Client

    /**
     * The password used to access the database
     */
    public password?: DatabasePassword

    constructor(data: DatabaseData, server: Server, client: Client) {

        const attributes = data.attributes

        this.id = attributes.id
        this.address = attributes.host.address
        this.port = attributes.host.port
        this.name = attributes.name
        this.username = attributes.username
        this.connectionsFrom = attributes.connections_from
        this.maxConnections = attributes.max_connections

        if (attributes.relationships && attributes.relationships.password) {
            this.password = new DatabasePassword(attributes.relationships.password)
        }

        this.server = server
        this.client = client
    }

    /**
     * Rotates the password of the database
     * @async
     * @returns The new password of the database
     */
    async rotatePassword(): Promise<DatabasePassword> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.server.identifier + "/databases/" + this.id + "/rotate-password",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        const data: DatabaseData = response.data
        const newPass: DatabasePassword = new DatabasePassword(data.attributes.relationships.password)

        this.password = newPass

        return newPass
    }

    /**
     * Deletes the database
     * @async 
     * @returns Always true, otherwise it throws an error
     */
    async delete(): Promise<boolean> {

        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "delete",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.server.identifier + "/databases/" + this.id,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        }, [204])

        return true
    }
}