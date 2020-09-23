
/**
 * @author Sheepe
 * @class
 * @classdesc A two-factor authentication recovery token
 */
export class RecoveryToken {

    /**
     * The token
     */
    public readonly token: string

    constructor(token: string) {

        this.token = token
    }

    /**
     * Returns the value of the token
     */
    toString(): string {
        return this.token
    }
}