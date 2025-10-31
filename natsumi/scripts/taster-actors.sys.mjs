export class NatsumiTasterTabsParentextends extends JSWindowActorParent {
    constructor() {
        super();
    }

    receiveMessage(message) {
        if (message.name === "Natsumi:TasterTest") {
            console.log("Received test message from child:", message.data);
        }
    }
}

export class NatsumiTasterTabsChild extends JSWindowActorChild {
    constructor() {
        super();
        this.modifierPressed = false;
    }

    handleEvent(event) {
        if (event.defaultPrevented) {
            return;
        }

        if (event.type === "click") {
            this.onClickEvent(event);
        }
    }

    receiveMessage(message) {
        if (message.name === "Natsumi:TasterModifierPressed") {
            this.modifierPressed = message.data.pressed;
        }
    }

    onClickEvent(event) {
        console.log(event);
        console.log(event.target.closest);

        if (event.target.closest && this.modifierPressed) {
            event.stopPropagation();
            event.preventDefault();

            // Fire test message
            this.sendAsyncMessage("Natsumi:TasterTest", {
                content: "hello world!"
            });
        }
    }
}