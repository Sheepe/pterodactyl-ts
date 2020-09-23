
import { Client } from "./Client"
import { PterodactylAPIError } from "./PterodactylAPIError"
import { APIRequest } from "./Request"
import { Server } from "./Server"

export type VariableData = {
    object: "egg_variable"
    attributes: {
        name: string
        description: string
        env_variable: string
        default_value: string
        server_value: string
        is_editable: boolean
        rules: string
    }
}

/**
 * @author Sheepe
 * @class
 * @classdesc A startup variable
 */
export class Variable {

    /**
     * The name of the variable
     */
    public readonly name: string
    /**
     * The description of the variable
     */
    public readonly description: string
    /**
     * The variable's identifier
     */
    public readonly identifier: string
    /**
     * The default value of the variable
     */
    public readonly default: string
    /**
     * The current value of the variable
     */
    public readonly value: string
    /**
     * Whether or not the variable is editable
     */
    public readonly editable: boolean
    /**
     * The rules imposed on this variable's value
     */
    public readonly rules: string

    /**
     * The server this variable belongs to
     */
    public readonly server: Server
    /**
     * The client used to access this variable
     */
    public readonly client: Client

    constructor(data: VariableData, server: Server, client: Client) {

        const attributes = data.attributes

        this.name = attributes.name
        this.description = attributes.description
        this.identifier = attributes.env_variable
        this.default = attributes.default_value
        this.value = attributes.server_value
        this.editable = attributes.is_editable
        this.rules = attributes.rules

        this.client = client
        this.server = server
    }

    /**
     * Sets the value of the variable.
     * If this is not editable, it will throw an error.
     * @async
     * @param value The new value of the variable
     * @returns The newly updated variable
     */
    async set(value: string): Promise<Variable> {

        if (!this.editable) throw new PterodactylAPIError(`Variable '${this.identifier}' cannot be modified`)

        if (!this.client.verified) throw new PterodactylAPIError(this.client.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "put",
            maxRedirects: 5,
            url: this.client.host + "/api/client/servers/" + this.server.identifier + "/startup/variable",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.client.token
            },
            data: {
                key: this.identifier,
                value: value
            }
        })

        return new Variable(response.data, this.server, this.client)
    }
}

export interface StartupOptions {
    readonly variables: Variable[]
    readonly startupCommand: string
    readonly startupCommandRaw: string
}