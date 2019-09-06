# webrtc-servicebus-signal

WebRTC signaling implemented over Azure Service Bus 📶

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/bengreenier/webrtc-servicebus-signal)

![project logo](./.github/logo.png)

This project provides a way to use [Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus/) as a [WebRTC Signaling](https://www.onsip.com/voip-resources/voip-fundamentals/webrtc-signaling) provider from any typescript application. However please note that this isn't a full featured implementation, it's just a proof of concept. Included here is a set of examples, and a core class [`symmetric-bus`](./src/lib/symmetric-bus.ts) that provides the connectivity. The expected use of this repository is to understand how one might use such a class to provide connectivity, how it scales, and how it works.

## Getting started

This repo is set up using [typescript](http://www.typescriptlang.org/), [eslint](https://eslint.org/), [prettier](https://prettier.io/), and [jest](https://jestjs.io/) to ensure quality and usability are top of mind. There's some great tooling for leveraging these things:

- [VS Code](https://code.visualstudio.com/)
- [Extension: Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Extension: Eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

To run the tests or examples, follow these steps:

- Install [Git](https://git-scm.com/)
- Install [Node + NPM](https://nodejs.org/en/)
- Clone this repository

```
git clone https://github.com/bengreenier/webrtc-servicebus-signal
```

- Enter the created directory

```
cd webrtc-servicebus-signal
```

- Install dependencies

```
npm install
```

- Build the source

```
npm run build
```

- Run the tests

```
npm test
```

- Run the examples

```
npm start
```

### Binary Releases

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/bengreenier/webrtc-servicebus-signal)

To simplify cases when one might simply want to run the examples without needing to build the source,binary releases are provided for Windows, Mac, and Linux on the [Releases Page](https://github.com/bengreenier/webrtc-servicebus-signal/releases/latest).

## Contributing

Open a PR against this repository, or create an Issue.
