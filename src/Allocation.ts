
export type AllocationData = {
    object: "allocation"
    attributes: {
        id: number
        ip: string
        ip_alias: string
        port: number
        notes: string
        is_default: boolean
    }
    meta?: Object
}

/**
 * @author Sheepe
 * @class 
 * @classdesc An allocation for the server
 */
export class Allocation {

    /**
     * The allocation id
     */
    public readonly id: number
    /**
     * The IP the server has been allocated
     */
    public readonly ip: string
    /**
     * An alias IP for the allocation
     */
    public readonly alias: string
    /**
     * The port for the allocation
     */
    public readonly port: number
    /**
     * Notes on the allocation
     */
    public readonly notes: string
    /**
     * Whether this allocation is the default or not
     */
    public readonly isDefault: boolean

    constructor(data: AllocationData) {

        const attributes = data.attributes

        this.id = attributes.id
        this.ip = attributes.ip
        this.alias = attributes.ip_alias
        this.port = attributes.port
        this.notes = attributes.notes
        this.isDefault = attributes.is_default
    }
}