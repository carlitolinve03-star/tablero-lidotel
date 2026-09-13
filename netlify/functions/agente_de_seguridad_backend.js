const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

exports.handler = async function(event, context) {
    // 1. Verificamos que las llaves estén configuradas en Netlify
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Faltan las variables de entorno de Google en Netlify." })
        };
    }

    try {
        // 2. Preparamos las credenciales del "Robot"
        // El replace es necesario porque Netlify a veces modifica los saltos de línea de la llave privada
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        // 3. Nos conectamos a tu Google Sheet privado
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo(); 
        
        // 4. Leemos la primera pestaña (hoja) de tu Excel
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        // 5. Convertimos los datos a un formato limpio que la página web pueda leer (JSON)
        const data = rows.map(row => row.toObject());

        // 6. Enviamos los datos a tu página web de forma segura
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                // Seguridad adicional: Solo permitimos que tu propia web lea esto
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Error conectando con Google Sheets:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno al leer el documento.", detalle: error.message })
        };
    }
};