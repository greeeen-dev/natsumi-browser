const _actors = new Set();
let _lazy = {};

ChromeUtils.defineESModuleGetters(_lazy, {
    ActorManagerParent: 'resource://gre/modules/ActorManagerParent.sys.mjs',
});

export class NatsumiActorWrapper {
    addWindowActors(actors) {
        for (let actorName in actors) {
            if (_actors.has(actorName)) {
                console.warn(`Actor ${actorName} is already registered, skipping.`);
                delete actors[actorName];
            }
        }

        try {
            _lazy.ActorManagerParent.addJSWindowActors(actors);
        } catch (e) {
            console.error("Failed to register JSWindowActors:", e);
        }

        for (let actorName in actors) {
            _actors.add(actorName);
        }
    }
}
