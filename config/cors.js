const corsConfig = {
    origin: function(origin, callback) {
      console.log('Incoming origin:', origin);
      const allowedOrigins = [
        'http://127.0.0.1:5500',        
        'http://localhost:5500',
        'https://dbarwick10.github.io',
        'https://dbarwick10.github.io/IndianaGeneralAssembly',
        'https://indianageneralassembly-production.up.railway.app',
        'https://legisalert.netlify.app',
        'https://legisalert.org',
        null 
      ];
      
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Origin', 
      'Access-Control-Allow-Origin', 
      'Accept'
    ]
  };
  
  export default corsConfig;