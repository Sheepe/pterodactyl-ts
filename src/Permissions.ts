
export type Permissions = {
    websocket: {
        description: string
        keys: {
            connect: string
        }
    }
    control: {
        description: string
        keys: {
            console: string
            start: string
            stop: string
            restart: string
        }
    }
    user: {
        description: string
        keys: {
            create: string
            read: string
            update: string
            delete: string
        }
    }
    file: {
        description: string
        keys: {
            create: string
            read: string
            update: string
            delte: string
            archive: string
            sftp: string
        }
    }
    backup: {
        description: string
        keys: {
            create: string
            read: string
            update: string
            delete: string
            download: string
        }
    }
    allocation: {
        description: string
        keys: {
            read: string
            create: string
            update: string
            delete: string
        }
    }
    startup: {
        description: string
        keys: {
            read: string
            update: string
        }
    }
    database: {
        description: string
        keys: {
            create: string
            read: string
            update: string
            delete: string
            view_password: string
        }
    }
    schedule: {
        description: string
        keys: {
            create: string
            read: string
            update: string
            delete: string
        }
    }
    settings: {
        description: string
        keys: {
            rename: string
            reinstall: string
        }
    }
}