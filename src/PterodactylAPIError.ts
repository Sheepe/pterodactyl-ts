
/**
 * @author Sheepe
 * @class
 * @classdesc Thrown when there is an API Error
 */
export class PterodactylAPIError extends Error {

    constructor(message?: string) {
        super(message)

        this.name = "PterodactylAPIError"
    }
}