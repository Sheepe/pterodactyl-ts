
import { Account } from "./Account";
import { PterodactylAPIError } from "./PterodactylAPIError";
import { APIRequest } from "./Request";
import { APIKey } from "./APIKey";
import { Server } from "./Server";
import { RecoveryToken } from "./RecoveryToken";
import { Permissions } from "./Permissions";

type FilterLevel = "all" | "admin" | "owner" | "subuser-of"

/**
 * @author Sheepe
 * @class
 * @classdesc An interface for the client API, acting as the user's account
 */
export class Client {

    /**
     * A repeatedly used error for if the client has not logged in
     */
    public readonly CLIENT_UNVERIFIED_ERROR: string = "Client is unverified, login to proceed"

    /**
     * The host of the panel
     */
    public readonly host: string
    /**
     * The API Key token being used to access the API
     */
    public readonly token: string

    private password: string

    /**
     * Returns whether the client has logged in and been verified
     */
    public verified = false

    /**
     * The client account tied to the provided token
     */
    public account?: Account;

    constructor(host: string, apiKey: string, password?: string) {

        if (host.endsWith("/")) {
            host = host.slice(0, -1)
        }

        this.host = host
        this.token = apiKey
        this.password = password || ""
    }

    /**
     * Attempts to verify the user. Must be ran before any requests are attempted
     * @async
     */
    async login(): Promise<boolean> {

        if (this.verified) return true

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/account",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        if (response.status === 200) {
            this.verified = true
            this.account = new Account(response.data)

            return true
        } else {
            return false
        }
    }

    /**
     * Gets the two factor authentication QR code image
     * @async
     * @returns Image that can be used to enable 2FA on the account
     */
    async getTwoFactorAuthQRCode(): Promise<string> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/account/two-factor",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        return response.data.data.image_url_data
    }

    /**
     * Enables two-factor authentication on the account
     * @async
     * @param totp - The one-time passcode that will be used to enable 2FA
     * @returns List of recovery tokens that can be used to access the account
     */
    async enable2FA(totp: string): Promise<RecoveryToken[]> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.host + "/api/client/account/two-factor",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: {
                code: totp.toString()
            }
        })

        let result = []

        for (const token of response.data.attributes.tokens) {
            result.push(new RecoveryToken(token))
        }

        return result
    }

    /**
     * Disables two-factor authentication on the account
     * @async
     * @param password The password of the account
     * @returns Always true, otherwise it will throw an error
     */
    async disable2FA(password?: string): Promise<boolean> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const pass = password || this.password
        if (!this.password) this.password = pass

        const response = await APIRequest({
            method: "delete",
            maxRedirects: 5,
            url: this.host + "/api/client/account/two-factor",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: {
                password: pass.toString()
            }
        }, [204])

        return true
    }

    /**
     * Updates the email of the account
     * @async
     * @param email The email to set it to
     * @param password The password of the account
     * @returns Always true, otherwise it will throw an error
     */
    async setEmail(email: string, password?: string): Promise<boolean> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const pass = password || this.password
        if (!this.password) this.password = pass

        const response = await APIRequest({
            method: "put",
            maxRedirects: 5,
            url: this.host + "/api/client/account/email",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: {
                email: email.toString(),
                password: pass.toString()
            }
        }, [204])

        return true
    }

    /**
     * Sets the password of the account
     * @async
     * @param newPassword The new password to set it to
     * @param password The old password
     * @returns Always true, otherwise it will throw an error
     */
    async setPassword(newPassword: string, password?: string): Promise<boolean> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const pass = password || this.password
        if (!this.password) this.password = pass

        const response = await APIRequest({
            method: "put",
            maxRedirects: 5,
            url: this.host + "/api/client/account/password",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: {
                current_password: pass.toString(),
                password: newPassword.toString(),
                password_confirmation: newPassword.toString()
            }
        }, [204])

        return true
    }

    /**
     * Gets all API Keys associated with the account
     * @async
     * @returns List of API Keys
     */
    async getAPIKeys(): Promise<APIKey[]> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/account/api-keys",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        const keys = response.data.data

        let result: APIKey[] = []

        for (const key of keys) {
            result.push(new APIKey(key))
        }

        return result
    }

    /**
     * Creates an API Key associated with the account
     * @async
     * @param description The description of the API Key
     * @param allowedIPs The IP's allowed to use the API Key
     * @returns The created API Key
     */
    async createAPIKey(description: string, allowedIPs?: string[]): Promise<APIKey> {

        if (description.length < 4) {
            throw new PterodactylAPIError("API Key description must be of length 4 or greater")
        }

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        let requestData = {
            description: description.toString()
        }

        if (allowedIPs) {
            requestData["allowed_ips"] = allowedIPs
        }

        const response = await APIRequest({
            method: "post",
            maxRedirects: 5,
            url: this.host + "/api/client/account/api-keys",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: requestData
        })

        return new APIKey(response.data, response.data.meta.secret_token)
    }

    /**
     * Deletes an API Key
     * @async
     * @param identifier The identifier of the API Key to delete
     * @returns Always true, otherwise it will throw an error
     */
    async deleteAPIKey(identifier: string): Promise<boolean> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "delete",
            maxRedirects: 5,
            url: this.host + "/api/client/account/api-keys/" + identifier,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        }, [204])

        return true
    }

    /**
     * Gets all of the servers associated with the account
     * @async
     * @param filterLevel The desired filter level
     * @returns List of server objects
     */
    async getServers(filterLevel?: FilterLevel): Promise<Server[]> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        if (filterLevel === undefined) {
            filterLevel = "subuser-of"
        }

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            },
            data: {
                type: filterLevel
            }
        })

        let result = []

        for (const server of response.data.data) {
            result.push(new Server(server, this))
        }

        return result
    }

    /**
     * Gets all of the servers that are owned by the client
     * Shorthand for `client.getServers("owner")`
     * @async
     * @returns List of server objects
     */
    async getOwnedServers(): Promise<Server[]> {
        return await this.getServers("owner")
    }

    /**
     * Gets all permissions on the account
     * @async
     * @returns Permissions object
     */
    async getAllPermissions(): Promise<Permissions> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/permissions",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        const permissions: Permissions = response.data.attributes.permissions

        return permissions
    }

    /**
     * Get the users permissions for a particular server
     * @async
     * @param identifier The identifier of the server
     * @returns List of permission strings
     */
    async getServerPermissions(identifier: string): Promise<string[]> {
        
        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/servers/" + identifier,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        return response.data.meta.user_permissions
    }

    /**
     * Gets a particular server by it's identifier
     * @async
     * @param identifier The identifier of the server
     * @returns The server object
     */
    async getServer(identifier: string): Promise<Server> {

        if (!this.verified) throw new PterodactylAPIError(this.CLIENT_UNVERIFIED_ERROR);

        const response = await APIRequest({
            method: "get",
            maxRedirects: 5,
            url: this.host + "/api/client/servers/" + identifier,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this.token
            }
        })

        return new Server(response.data, this)
    }
}