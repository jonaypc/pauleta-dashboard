
const url = 'https://flhamfpkyxjsntaysdwn.supabase.co/storage/v1/object/public/gastos/facturas_gastos/1770498133028-mbscwt.jpeg';

fetch(url, { method: 'HEAD' })
    .then(res => {
        console.log('Status:', res.status);
        console.log('Headers:', Object.fromEntries(res.headers.entries()));
    })
    .catch(err => console.error('Fetch error:', err));
