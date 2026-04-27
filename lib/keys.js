const proxylist = require("./proxylist")

const keys = {
    athenaUrl : "https://cffw-apigql-prod2504180048.cf.px.athena.io/graphql",
    API_KEY:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    STRIPE_KEY:'live_51PL8Ki2MTuMr1tAfFrwTonV4t5hTBwhsQigSzpE34vdwAGvjURW1j6nqw5wAIUUL2QW4EDl8MPJReqjunghM4MOu00XAc0XbZb',
    STRIPE_PUBLIC_KEY:'pk_live_51PL8Ki2MTuMr1tAf3yRyc8SDR0JNl3l7n3nDUoXq4pP9eSRnqmeJYxsaeZRpVibZ3pjAtGgcku07pJJOS18EO58e00xN7mUk4r',
    proxies:proxylist,
    DOMAIN_NAME : "https://gate.athenahealthweb.com",
    MAIN_DOMAIN_NAME : "https://payment.axcentrahub.com",
    AMOUNT:40,
    SUPABASE_PUBLIC_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeGpoZnRydmRpb2xvcWF1ZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODA4Njg2OCwiZXhwIjoyMDUzNjYyODY4fQ.o61MqMk-9IRddSQqRAzhaQnujcj7GZb1PqPszR8kZZQ',

    SQUARE_ACCESS_TOKEN: "EAAAl4xfI7nGpTiNlHbBEr6sXKVFsh8XvnpfeWmiILLebkBIErX81QuMQHLJNyIe", // sandbox or production token
  SQUARE_APPLICATION_ID: "sq0idp-g3T6MYXcfm9_a6R-FnVb0g", // app ID
  

    SQUARE_LOCATION_ID:'LB8CZWYNHYWRP',
    CURRENT_PAYMENT_GATEWAY:'authorize', // 'stripe' or 'squareup' or 'paypal'
    IS_SANDBOX:false,
    SUCCESS_PAGE_DETAILS : {
        email:'payment@yrkgroup.com',
        phone:'+1 (201) 534-6549',
        company_name:'YRKBill.co',
    },
    AUTHORIZE:{
        SANDBOX:{
            PUBLIC_CLIENT_KEY:'959k2q428e43QRbKe9xbwsZM7XZzFYtS67c6vwCUsU95MNduErdD365zxZDk3xeu',
            API_LOGIN_ID:'8Q2Xb25vhW',
            TRANSACTION_KEY:'6de2Am264TRT8jKG',
            SIGNATURE_KEY:'7E4831183999CCE074E04F91AB6F580DC3EACDF720D1995C9F05C9CD698AF534885E9457CE1B68CBF428F8831BEEACF021D4FA4EBB2F2BFDA91FE349338B2AF0'
        },
        PRODUCTION:{
            PUBLIC_CLIENT_KEY:'5EejFhs4KWPMa34857AaD7kF7UXzt359y5QB5ZssG9tGs4nfqqSPS3kx88r846W7',
            API_LOGIN_ID:'2u92VsW2r',
            TRANSACTION_KEY:'444t3Sty82qEbVZm',
            SIGNATURE_KEY:'DA280FFAC14D89D547B3FFA4DA55385864894227313FA17BF07F6432C2EBE7F967782D220E57C7B319CA7BA353C518AD434CC0287A6838C074D17386FD418F79'
        }
    },
     NMI:{
        PRODUCTION:{
            PRIVATE_KEY:'pK429K9HpbzJVP86hDe23QhYWwJMa6bX',
            TOKENIZATION_KEY:'8Ec449-BU52KZ-X26S8E-PV6wp3',
            CHECKOUT_PUBLIC_KEY:'checkout_public_5EvVeFqbXu5QDc669Zm32uqc2q39n4YF'
        },
        SANDBOX:{
            PRIVATE_KEY:'7wm489YG68rV88QZr78VffNd3eKzp34G',
            TOKENIZATION_KEY:'DKJH2y-4a84Yf-5pPDkZ-Yc3J8W',
        }


    },
     domains:{
        
        "za-x2":"https://payment.athenahealthweb.com",
        "if-x3":"https://xyz.com"
    }
}


module.exports = keys
