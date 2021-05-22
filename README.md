# Deploy to IPFS

## Example

This action will build a node project and deploy the artifacts generated in the
build folder directly to IPFS. The action will also update the Cloudflare DNS
records to make sure that dnslink stays up to date with the latest IPFS cid.

After the action has completed the execution your build will be available from
your domain (in this case app.example.com)

```yml
name: Deployment
on:
  push:
    branches:
      - master
jobs:
  sync:
    name: Verify and sync data to IPFS
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v2

      - name: Generate build artifact
        run: npm build

      - name: Sync to IPFS
        id: upload
        uses: nymmrx/ipfs-deploy@master
        with:
          path: "./build"
          pin-name: My Awesome Project
          pinata-key: ${{ secrets.PINATA_KEY }}
          pinata-secret: ${{ secrets.PINATA_SECRET }}
          cloudflare-zone-id: ${{ secrets.CLOUDFLARE_ZONE }}
          cloudflare-secret: ${{ secrets.CLOUDFLARE_SECRET }}
          record-domain: example.com
          record-name: _dnslink.app
```

<!-- TODO

## Setup

### AWS Route53

### Cloudflare

-->
