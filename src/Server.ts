
import { Allocation, AllocationData } from "./Allocation"
import { Client } from "./Client"
import { APIRequest } from "./Request"
import { WebsocketDetails } from "./WebsocketDetails"
import { Database } from "./Database"
import { PterodactylAPIError } from "./PterodactylAPIError"
import { FileManager } from "./FileManager"
import { StartupOptions, Variable } from "./Variable"

export type SFTP = {
    ip: string
    port: number
}

export type ServerLimits = {
    memory: number
    swap: number
    disk: number
    io: number
    cpu: number
}

export type ServerFeatureLimits = {
    databases: number
    allocations: number
    backups: number
}

export type ServerData = {
    object: "server"
    attributes: {
        server_owner: boolean
        identifier: string
        uuid: string
        name: string
        node: string
        sftp_details: {
            ip: string
            port: number
        }
        description: string
        limits: {
            memory: number
            swap: number
            disk: number
            io: number
            cpu: number
        }
        feature_limits: {
            databases: number
            allocations: number
            backups: number
        }
        is_suspended: boolean
        is_installing: boolean
        relationships: {
            allocations?: {
                object: "list",
                data: AllocationData[]
            }
        }
    }
    meta?: Object
}

export type ServerState = "stopped" | "starting" | "running" | "offline" | "stopping"

export type ServerStatusData = {
    object: "stats"
    attributes: {
        current_state: ServerState
        is_suspended: boolean
        resources: {
            memory_bytes: number
            cpu_absolute: number
            disk_bytes: number
            network_rx_bytes: number
            network_tx_bytes: number
        }
    }
}

/**
 * @author Sheepe
 * @class
 * @classdesc Datastructure encoding the status of the server
 */
export class ServerStatus {
    
    /**
     * The current state of the server. Can be one of:
     * * `stopped`
     * * `starting`
     * * `running`
     * * `offline`
     * * `stopping`
     */
    public readonly state: ServerState
    /**
     * Whether the server is currently suspended
     */
    public readonly suspended: boolean
    
    /**
     * The current memory usage of the server
     */
    public readonly memoryUsage: number
    /**
     * The current CPU usage of the server
     */
    public readonly cpuUsage: number
    /**
     * The current disk usage of the server
     */
    public readonly diskUsage: number
    /**
     * The current amount of incoming data
     */
    public readonly networkRecieve: number
    /**
     * The current amount of outgoing data
     */
    public readonly networkTransmit: number

    constructor(data: ServerStatusData) {

        const attributes = data.attributes

        this.state = attributes.current_state
        this.suspended = attributes.is_suspended

        this.memoryUsage = attributes.resources.memory_bytes
        this.cpuUsage = attributes.resources.cpu_absolute
        this.diskUsage = attributes.resources.disk_bytes
        
        this.networkRecieve = attributes.resources.network_rx_bytes
        this.networkTransmit = attributes.resources.network_tx_bytes
    }
}

export type ServerPowerSignal = "start" | "stop" | "kill" | "restart"

/**
 * @author Sheepe
 * @class
 * @classdesc An object for interfacing with a server
 */
export class Server {

    /**
     * Whether the client accessing this server is the owner
     */
    public readonly owner: boolean
    /**
     * The identifier of the server
     */
    public readonly identifier: string
    /**
     * The universally unique identifier of the server
     */
    public readonly uuid: string
    /**
     * The name of the server
     */
    public readonly name: string
    /**
     * The node the server exists on
     */
    public readonly node: string
    /**
     * The description of the server
     */
    public readonly description: string
    /**
     * Whether the server is currently suspended or not
     */
    public readonly suspended: boolean
    /**
     * Whether the server is installing or not
     */
    public readonly installing: boolean

    /**
     * The server's memory limit
     */
    public readonly memoryLimit: number
    /**
     * The server's swap memory limit
     */
    public readonly swapLimit: number
    /**
     * The server's disk limit
     */
    public readonly diskLimit: number
    /**
     * The server's input/output limit
     */
    public readonly ioLimit: number
    /**
     * The server's CPU limit
     */
    public readonly cpuLimit: number

    /**
     * The server's database limit
     */
    public readonly databaseLimit: number
    /**
     * The server's allocation limit
     */
    public readonly allocationLimit: number
    /**
     * The server's backup limit
     */
    public readonly backupLimit: number

    /**
     * The server's allocations
     */
    public readonly allocations: Allocation[] = []

    /**
     * The client used to access the server
     */
    public readonly client: Client

    private sftp: SFTP
    private limits: ServerLimits
    private featureLimits: ServerFeatureLimits

    constructor(data: ServerData, client: Client) {

        const attributes = data.attributes

        this.owner = attributes.server_owner
        this.identifier = attributes.identifier
        this.uuid = attributes.uuid
        this.name = attributes.name
        this.node = attributes.node
        this.description = attributes.description

        this.suspended = attributes.is_suspended
        this.installing = attributes.is_installing

        this.sftp = {
            ip: attributes.sftp_details.ip,
            port: attributes.sftp_details.port
        }

        this.limits = {
            memory: attributes.limits.memory,
            swap: attributes.limits.swap,
            disk: attributes.limits.disk,
            io: attributes.limits.io,
            cpu: attributes.limits.cpu
        }

        this.featureLimits = {
            databases: attributes.feature_limits.databases,
            allocations: attributes.feature_limits.allocations,
            backups: attributes.feature_limits.backups
        }

        this.memoryLimit = this.limits.memory
        this.swapLimit = this.limits.swap
        this.diskLimit = this.limits.disk
        this.ioLimit = this.limits.io
        this.cpuLimit = this.limits.cpu

        this.databaseLimit = this.featureLimits.databases
        this.allocationLimit = this.featureLimits.allocations
        this.backupLimit = this.featureLimits.backups

        if (attributes.relationships.allocations) {
            for (const allocation of attributes.relationships.allocations.data) {
                this.allocations.push(new Allocation(allocation))
            }
        }

        this.client = client
    }
    
    /**
     * Gets the webhook details for accessing the server console
     * @async
     * @returns The websocket login details
     */
    async getConsoleDetails(): Promise<WebsocketDetails> {

        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/websocket",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        const details: WebsocketDetails = response.data.data

        return details
    }

    /**
     * Gets the server's current status
     * @async
     * @returns The status of the server
     */
    async getServerStats(): Promise<ServerStatus> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/resources",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        return new ServerStatus(response.data)
    }

    /**
     * Checks whether the server is currently running
     * @async
     * @returns Whether the server is running or not
     */
    async isRunning(): Promise<boolean> {
        const stats = await this.getServerStats()
        return stats.state === "running"
    }

    /**
     * Checks if the server is offline
     * @async
     * @returns Whether the server is offline or not
     */
    async isOffline(): Promise<boolean> {
        const stats = await this.getServerStats()
        return stats.state === "offline"
    }

    /**
     * Checks if the server is starting
     * @async
     * @returns Whether the server is starting or not
     */
    async isStarting(): Promise<boolean> {
        const stats = await this.getServerStats()
        return stats.state === "starting"
    }

    /**
     * Checks if the sevrer is stopping
     * @async
     * @returns Whether the server is stopping or not
     */
    async isStopping(): Promise<boolean> {
        const stats = await this.getServerStats()
        return stats.state === "stopping"
    }

    /**
     * Checks if the server is stopped
     * @async 
     * @returns Whether the server has stopped or not
     */
    async isStopped(): Promise<boolean> {
        const stats = await this.getServerStats()
        return stats.state === "stopped"
    }

    /**
     * Sends a command to the server's console
     * @async
     * @param command The command to send
     * @returns Always true, otherwise will throw an error
     */
    async sendCommand(command: string): Promise<boolean> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/command",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            },
            data: {
                command: command.toString()
            }
        }, [204])

        return true
    }

    /**
     * Sends a power signal to the server
     * @async
     * @param state The state to send
     * @returns Always true, otherwise will throw an error
     */
    async sendPowerSignal(state: ServerPowerSignal): Promise<boolean> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/power",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            },
            data: {
                signal: state
            }
        }, [204])

        return true
    }

    /**
     * Shorthand for `server.sendPowerSignal("start")`
     * @async
     * @returns Always true, otherwise will throw an error
     */
    async start(): Promise<boolean> {
        return await this.sendPowerSignal("start")
    }

    /**
     * Shorthand for `server.sendPowerSignal("stop")`
     * @async
     * @returns Always true, otherwise will throw an error
     */
    async stop(): Promise<boolean> {
        return await this.sendPowerSignal("stop")
    }

    /**
     * Shorthand for `server.sendPowerSignal("restart")`
     * @async
     * @returns Always true, otherwise will throw an error
     */
    async restart(): Promise<boolean> {
        return await this.sendPowerSignal("restart")
    }
    
    /**
     * Shorthand for `server.sendPowerSignal("kill)`
     * @async
     * @returns Always true, otherwise will throw an error
     */
    async kill(): Promise<boolean> {
        return await this.sendPowerSignal("kill")
    }

    /**
     * Gets the databases connected to the server
     * @async
     * @returns List of database objects
     */
    async getDatabases(): Promise<Database[]> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/databases",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        let result = []

        for (const database of response.data.data) {
            result.push(new Database(database, this, this.client))
        }

        return result
    }

    /**
     * Creates a new database associated with the server
     * @async
     * @param database The name of the databse
     * @param remote The remote of the database
     * @returns The newly created database
     */
    async createDatabase(database: string, remote: string): Promise<Database> {

        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/databases",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            },
            data: {
                database: database,
                remote: remote
            }
        })

        return new Database(response.data, this, this.client)
    }

    /**
     * Gets the file manager for the server, an object for accessing files
     * @async
     * @returns The file manager
     */
    async getFileManager(): Promise<FileManager> {
        
        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/files/list",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        return new FileManager(response.data, this)
    }

    /**
     * Gets the current startup options of the server
     * @async
     * @returns The startup options
     */
    async getStartupOptions(): Promise<StartupOptions> {

        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.identifier + "/startup",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            }
        })

        const variables: Variable[] = []

        for (const variable of response.data.data) {
            variables.push(new Variable(variable, this, this.client))
        }

        return {
            variables: variables,
            startupCommand: response.data.meta.startup_command,
            startupCommandRaw: response.data.meta.raw_startup_command
        }
    }
}