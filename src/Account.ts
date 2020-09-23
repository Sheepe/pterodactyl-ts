
export type AccountData = {
    object: "user"
    attributes: {
        id: number
        admin: boolean
        username: string
        email: string
        first_name: string
        last_name: string
        language: string
    }
    meta?: Object
}

/**
 * @author Sheepe
 * @class
 * @classdesc Stores the data for an account
 */
export class Account {

    /**
     * The id of the user
     */
    public readonly userId: number
    /**
     * Whether this is an admin account or not
     */
    public readonly admin: boolean
    /**
     * The username of the account
     */
    public readonly username: string
    /**
     * The email associated with the account
     */
    public readonly email: string
    /**
     * The stored first name of the user
     */
    public readonly firstName: string
    /**
     * The stored surname of the user
     */
    public readonly lastName: string
    /**
     * The language associated with the account
     */
    public readonly language: string

    constructor(data: AccountData) {

        const attributes = data.attributes

        this.userId = attributes.id
        this.admin = attributes.admin
        this.username = attributes.username
        this.email = attributes.email
        this.firstName = attributes.first_name
        this.lastName = attributes.last_name
        this.language = attributes.language
    }
}