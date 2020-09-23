
export type APIKeyData = {
    object: "api_key"
    attributes: {
        identifier: string
        description: string
        allowed_ips: string[]
        last_used_at: string
        created_at: string
    }
    meta?: Object
}

/**
 * @author Sheepe
 * @class
 * @classdesc An API Key
 */
export class APIKey {

    /**
     * The identifier for the API Key
     */
    public readonly identifier: string
    /**
     * The description of the API given
     */
    public readonly description: string
    /**
     * Array of IP's that are allowed to use this key
     */
    public readonly allowedIPs: string[]
    /**
     * The date of when it was last used
     */
    public readonly lastUsedAt: Date
    /**
     * The date of when it was created
     */
    public readonly createdAt: Date

    /**
     * The token associated with the API Key
     */
    public readonly token?: string

    constructor(data: APIKeyData, token?: string) {

        const attributes = data.attributes

        this.identifier = attributes.identifier
        this.description = attributes.description
        this.allowedIPs = attributes.allowed_ips

        if (attributes.last_used_at === null) {
            this.lastUsedAt = null
        } else {
            this.lastUsedAt = new Date(attributes.last_used_at)
        }

        if (attributes.created_at === null) {
            this.createdAt = null
        } else {
            this.createdAt = new Date(attributes.created_at)
        }

        this.token = token
    }

    /**
     * Returns the current value of the token of the API Key. Can be undefined
     */
    toString(): string | undefined {
        return this.token
    }
}