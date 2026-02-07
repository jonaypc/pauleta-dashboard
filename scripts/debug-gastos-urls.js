
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Checking latest expenses...')
    const { data: expenses, error } = await supabase
        .from('gastos')
        .select('id, created_at, archivo_url, notas')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching expenses:', error)
        return
    }

    console.log(`Found ${expenses.length} recent expenses:`)
    expenses.forEach(e => {
        console.log(`ID: ${e.id}`)
        console.log(`Created: ${e.created_at}`)
        console.log(`URL: ${e.archivo_url}`)
        console.log(`Notes (snippet): ${e.notas?.substring(0, 50)}...`)
        console.log('---')
    })

    // Check bucket public status if possible (indirectly via getPublicUrl)
    const { data } = supabase.storage.from('gastos').getPublicUrl('test.txt')
    console.log('Test Public URL generation:', data.publicUrl)
}

main()
