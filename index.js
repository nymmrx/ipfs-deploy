const path = require("path");

const PinataSdk = require("@pinata/sdk");
const core = require("@actions/core");

const Cloudflare = require("cloudflare");
const AWS = require("aws-sdk");
const CID = require("cids");

const PinName = core.getInput("pin-name");
const PinRemoveOld = core.getBooleanInput("pin-remove-old");

const PinataKey = core.getInput("pinata-key");
const PinataSecret = core.getInput("pinata-secret");

const CfZoneId = core.getInput("cloudflare-zone-id");
const CfSecret = core.getInput("cloudflare-secret");
const AwsAccessKey = core.getInput("aws-access-key");
const AwsAccessSecret = core.getInput("aws-access-secret");
const AwsZoneId = core.getInput("aws-zone-id");

const RecordDomain = core.getInput("record-domain");
const RecordName = core.getInput("record-name");
const RecordTtl = parseInt(core.getInput("record-ttl")) || 60;

const Path = core.getInput("path");

const Workspace = process.env.GITHUB_WORKSPACE.toString();

async function main() {
  const uploadPath = path.isAbsolute(Path) ? Path : path.join(Workspace, Path);

  // deployment

  const pinata = PinataSdk(PinataKey, PinataSecret);
  const pinataPinOptions = {
    pinataMetadata: { name: PinName },
    pinataOptions: { cidVersion: 0, wrapWithDirectory: false },
  };
  const hash = await pinata.pinFromFS(uploadPath, pinataPinOptions);
  const cidv0 = hash.IpfsHash;

  if (PinRemoveOld) {
    const filters = {
      status: "pinned",
      pageLimit: 1000,
      pageOffset: 0,
      metadata: { name: PinName },
    };
    const pinned = await pinata.pinList(filters);
    pinned.rows.forEach((element) => {
      if (element.ipfs_pin_hash != cidv0) {
        pinata.unpin(element.ipfs_pin_hash);
      }
    });
  }

  // domain update

  if (CfZoneId && CfSecret) {
    const domain = `${RecordName}.${RecordDomain}`;
    const content = `dnslink=/ipfs/${cidv0}`;
    const cf = new Cloudflare({ token: CfSecret });
    const records = await cf.dnsRecords.browse(CfZoneId);
    const result = records.result;
    const dnslink = result.find((record) => record.name === domain);
    await cf.dnsRecords.edit(CfZoneId, dnslink.id, {
      type: "TXT",
      name: domain,
      content,
      ttl: RecordTtl,
    });
  }

  if (AwsAccessKey && AwsAccessSecret && AwsZoneId) {
    const domain = `${RecordName}.${RecordDomain}`;
    const content = `"dnslink=/ipfs/${cidv0}"`;
    AWS.config.update({
      AwsAccessKey,
      AwsAccessSecret,
      region: "us-east-1",
    });
    const route53 = new AWS.Route53();
    route53.changeResourceRecordSets({
      HostedZoneId: AwsZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: domain,
              Type: "TXT",
              TTL: RecordTtl,
              ResourceRecords: [
                {
                  Value: content,
                },
              ],
            },
          },
        ],
      },
    });
  }

  const cidv1 = new CID(cidv0).toV1().toString();
  core.setOutput("cidv0", cidv0);
  core.setOutput("cidv1", cidv1);
}

try {
  main();
} catch (error) {
  core.setFailed(error);
}
