import { Construct, Stack, StackProps, CfnOutput } from "@aws-cdk/core";
import {
  PolicyStatement,
  Effect,
  Role,
  CompositePrincipal,
  ServicePrincipal,
  ManagedPolicy,
  AnyPrincipal,
} from "@aws-cdk/aws-iam";
import {
  Vpc,
  NatProvider,
  Instance,
  InstanceType,
  NatInstanceProvider,
  CfnEIP,
  SubnetType,
  InstanceClass,
  InstanceSize,
  SecurityGroup,
  Peer,
  Port,
} from "@aws-cdk/aws-ec2";

interface IamStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly vpc: Vpc;
}

class IamStack extends Stack {
  public readonly taskDefExecutionRole: Role;
  public readonly nlbSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    /**
     * Get var from props
     */
    const { prefix, stage, vpc } = props;

    /**
     * Creation of Execution Role for our task
     */
    const taskDefExecutionRole = new Role(
      this,
      `${prefix}-${stage}-exec-role`,
      {
        roleName: `${prefix}-${stage}-exec-role`,
        assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      },
    );

    /**
     * Adding permissions to the above created role...basically giving permissions to ECR image and Cloudwatch logs
     */
    taskDefExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        effect: Effect.ALLOW,
        resources: ["*"],
      }),
    );

    /**
     * Create your own security Group using VPC
     */
    const nlbSecurityGroup = new SecurityGroup(this, "search-api-sg", {
      securityGroupName: "search-sg",
      vpc: vpc,
      allowAllOutbound: true,
    });

    /**
     * Add IngressRule to access the docker image on 80 and 3000 ports
     */
    // nlbSecurityGroup.addIngressRule(
    //   Peer.ipv4("0.0.0.0/0"),
    //   Port.tcp(80),
    //   "SSH frm anywhere",
    // );
    // nlbSecurityGroup.addIngressRule(Peer.ipv4("0.0.0.0/0"), Port.tcp(3000), "");
    nlbSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Access from anywhere",
    );
    // nlbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3000), "");

    /**
     * Assign service to gloabal var
     */
    this.taskDefExecutionRole = taskDefExecutionRole;
    this.nlbSecurityGroup = nlbSecurityGroup;
  }
}

export { IamStack };
