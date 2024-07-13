import tools from './tools.js';
export default (router) => {
    router.get("/", (req, res) => {
        res.render("home", {
            title: "Home"
        });
    });

    router.get("/new-editor/", (req, res) => {
        const newRoom =  tools.randomString(process.env.DEFAULT_LENGTH_ROOM_NAME);
        res.redirect(`/editor/${newRoom}/`);
    });
    
    router.get("/editor/:room/", (req, res) => {
        // uniquement chiffre lettre et tiret        
        if (!/^[a-z0-9-]+$/.test(req.params.room))  res.redirect(`/new-editor/`);
        else {
            res.render("editor", {
                title: "Editor",
                room: req.params.room
            });
        }
    });

    // on redirige pour toute adresse
    router.all('*', (req, res) => {
        res.redirect(`/`);
    })
};