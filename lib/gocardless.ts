const GOCARDLESS_BASE_URL = "https://bankaccountdata.gocardless.com/api/v2"

interface GoCardlessTokenResponse {
    access: string
    refresh: string
    access_expires: number
    refresh_expires: number
}

interface Institution {
    id: string
    name: string
    bic: string
    transaction_total_days: string
    countries: string[]
    logo: string
}

export class GoCardlessClient {
    private secretId: string
    private secretKey: string

    constructor() {
        this.secretId = process.env.GOCARDLESS_SECRET_ID || ""
        this.secretKey = process.env.GOCARDLESS_SECRET_KEY || ""
    }

    private async getAccessToken() {
        const response = await fetch(`${GOCARDLESS_BASE_URL}/token/new/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                secret_id: this.secretId,
                secret_key: this.secretKey,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`GoCardless Auth Error: ${JSON.stringify(error)}`)
        }

        const data: GoCardlessTokenResponse = await response.json()
        return data.access
    }

    async getInstitutions(country: string = "ES") {
        const token = await this.getAccessToken()
        const response = await fetch(`${GOCARDLESS_BASE_URL}/institutions/?country=${country}`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error("Failed to fetch institutions")
        return await response.json() as Institution[]
    }

    async createRequisition(institutionId: string, redirectUrl: string, reference: string) {
        const token = await this.getAccessToken()
        const response = await fetch(`${GOCARDLESS_BASE_URL}/requisitions/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                redirect: redirectUrl,
                institution_id: institutionId,
                reference: reference,
                user_language: "ES",
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to create requisition: ${JSON.stringify(error)}`)
        }

        return await response.json()
    }

    async getRequisition(requisitionId: string) {
        const token = await this.getAccessToken()
        const response = await fetch(`${GOCARDLESS_BASE_URL}/requisitions/${requisitionId}/`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error("Failed to fetch requisition")
        return await response.json()
    }

    async getTransactions(accountId: string) {
        const token = await this.getAccessToken()
        const response = await fetch(`${GOCARDLESS_BASE_URL}/accounts/${accountId}/transactions/`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to fetch transactions: ${JSON.stringify(error)}`)
        }

        return await response.json()
    }
}

export const gocardless = new GoCardlessClient()
