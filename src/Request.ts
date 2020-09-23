
import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { PterodactylAPIError } from "./PterodactylAPIError";

export async function APIRequest(options: AxiosRequestConfig, supressErrors = []): Promise<AxiosResponse<any>> {

    const [response, error] = await makeRequest(options)

    if (response) {
        if (response.status === 200 || supressErrors.includes(response.status)) {
            return response
        } else {
            throw new PterodactylAPIError(`An unexpected error occurred (${response.status}): ` + response.statusText)
        }
    } else {
        for (const e of error) {
            if (e.code && e.status && e.detail) {
                throw new PterodactylAPIError(`${e.code} (${e.status}): ${e.detail}`)
            } else if (e.code && e.source && e.detail) {
                throw new PterodactylAPIError(e.detail)
            }
        }
    }
}

export async function makeRequest(options: AxiosRequestConfig): Promise<[AxiosResponse<any>, any]> {

    try {
        return [await Axios.request(options), undefined]

    } catch (error) {
        if (error.response) {

            const response = error.response

            if (response.status === 403) {
                throw new Error("Invalid API key provided, request failed")
            } else if (response.data && response.data.errors) {
                return [undefined, response.data.errors]
            } else {
                throw error
            }

        } else {
            if (error.code === "ECONNREFUSED") {
                throw new Error("Unable to connect to host, connection refused")
            } else if (error.code === "ENOTFOUND") {
                throw new Error("Unable to connect to host, host not found")
            } else {
                throw error
            }
        }
    }
}