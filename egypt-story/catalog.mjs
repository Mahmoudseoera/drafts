export const experiences = [
 {id:'pyramids',title:'Pyramids at sunrise',city:'Cairo',tags:['history'],price:60,icon:'△',description:'Meet the last surviving wonder of the ancient world in the soft morning light.',image:'../assets/images/blogs/camel front of giza pyramids.jpg'},
 {id:'kings',title:'Valley of the Kings',city:'Luxor',tags:['history','culture'],price:70,icon:'𓋹',description:'Step into the painted tombs of pharaohs beneath the Theban hills.'},
 {id:'karnak',title:'Karnak Temple',city:'Luxor',tags:['history'],price:50,icon:'𓉛',description:'Wander among monumental columns and stories carved in stone.'},
 {id:'sail',title:'Felucca sunset sail',city:'Aswan',tags:['relaxation'],price:30,icon:'◭',description:'Let the river set the pace aboard a traditional sailing boat.'},
 {id:'cruise',title:'Nile cruise',city:'Aswan',tags:['relaxation','luxury'],price:420,icon:'≈',description:'Watch Egypt unfold from the river. Route and sailing duration to be arranged.'},
 {id:'food',title:'Street-food walk',city:'Cairo',tags:['food','culture'],price:35,icon:'◉',description:'Discover Cairo one delicious stop at a time with a local guide.'},
 {id:'desert',title:'White Desert camp',city:'White Desert',tags:['adventure'],price:null,icon:'✧',description:'An otherworldly landscape of chalk formations beneath a sky full of stars.'},
 {id:'sea',title:'Red Sea snorkeling',city:'Hurghada',tags:['beach','adventure'],price:null,icon:'≋',description:'Discover coral gardens and a slower rhythm by the Red Sea.'},
 {id:'balloon',title:'Luxor hot-air balloon',city:'Luxor',tags:['adventure'],price:null,icon:'♧',description:'See the west bank from above at daybreak, subject to weather.'},
 {id:'abu',title:'Abu Simbel',city:'Aswan',tags:['history','culture'],price:null,icon:'𓁹',description:'Discover the monumental rock-cut temples of Ramesses II. Transfer arrangements to be confirmed.',secret:true}
];
export const byId = id => experiences.find(x=>x.id===id);
export const cities=['Cairo','Luxor','Aswan','Hurghada','White Desert'];
