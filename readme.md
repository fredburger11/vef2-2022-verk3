# Vefforritun 2, 2022. Verkefni 3: Viðburðakerfis vefþjónustur

username: admin, password: 123

```bash
npm install
createdb vef2-2022-verk3
# setja rétt DATABASE_URL í .env
node ./src/setup.js # eða npm run setup
npm run dev
```


## indexRouter.get('/events/:id) er ekki að virka

###### Hugleiðingar

# Spyrja um notandan sem ég skrái hvort hann þurfi að vera admin
# Hvaða get/post þarf að taka út
# xss sanitation í routes!!!
# Spurning með get('/login' og '/register') og login.js!!
# Hvernig checka ég á því hvort að notandi sé 'eigandi' "pósts";
# Vandamál með að nota users/login og users/register
