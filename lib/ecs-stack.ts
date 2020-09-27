import {
  Construct,
  Stack,
  StackProps,
  CfnOutput,
  Duration,
} from "@aws-cdk/core";
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  FargateService,
  Protocol,
  AwsLogDriver,
} from "@aws-cdk/aws-ecs";
import {
  Vpc,
  SecurityGroup,
  InstanceType,
  InstanceClass,
  InstanceSize,
} from "@aws-cdk/aws-ec2";
import { Role } from "@aws-cdk/aws-iam";
import { LogGroup } from "@aws-cdk/aws-logs";

interface EcsStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly execRole: Role;
  readonly vpc: Vpc;
  readonly nlbSecurityGroup: SecurityGroup;
}

class EcsStack extends Stack {
  public readonly fargateService: FargateService;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    /**
     * Get var from props
     */
    const { prefix, stage, execRole, vpc, nlbSecurityGroup } = props;

    /**
     * Create Cluster
     */
    const cluster = new Cluster(this, `${prefix}-${stage}-Cluster`, {
      clusterName: `${prefix}-${stage}-Cluster`,
      vpc,
      containerInsights: true,
    });

    /**
     * Ec2 Auto-Scaling-Group
     */
    // cluster.addCapacity(`${prefix}-${stage}-Default-Auto-Scaling-Group`, {
    //   instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
    // });

    /**
     * Create CloudWatch Logs
     */
    // const logging = new AwsLogDriver({
    //   streamPrefix: `${prefix}-${stage}-web-log`,
    // });
    // const logGroup = LogGroup.fromLogGroupName(
    //   this,
    //   `${prefix}-${stage}-log-group`,
    //   `/ecs/${prefix}/${stage}/task`,
    // );
    // console.log(logGroup);

    // const logging = new AwsLogDriver({
    //   logGroup: logGroup
    //     ? logGroup
    //     : new LogGroup(this, `${prefix}-${stage}-log-group`, {
    //         logGroupName: `/ecs/${prefix}/${stage}/task`,
    //       }),
    //   streamPrefix: "ecs",
    // });

    /**
     * Create Task Definition
     */
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${prefix}-${stage}-Task-Def`,
      {
        // cpu: 256,
        // memoryLimitMiB: 512,
        executionRole: execRole,
        taskRole: execRole,
      },
    );

    /**
     * Add Container
     */
    const container = taskDefinition.addContainer("DefaultContainer", {
      // image: ContainerImage.fromAsset("./app"),
      image: ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      // image: ContainerImage.fromRegistry("nginx:latest"),
      memoryLimitMiB: 64,
      cpu: 64,
      // logging,
    });

    /**
     * Add Container Port
     */
    container.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: Protocol.TCP,
    });

    /**
     * Create Fragate Services
     */
    const fargateService = new FargateService(this, "Service", {
      serviceName: `${prefix}-${stage}-Service`,
      cluster,
      taskDefinition,
      desiredCount: 2,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      assignPublicIp: true,
      securityGroup: nlbSecurityGroup,
    });

    /**
     * Assign service to gloabal var
     */
    this.fargateService = fargateService;

    /**
     * Cfn Ouput
     */
    this.createCfnOutput({
      id: `${prefix}-${stage}-Cluster-Name`,
      value: cluster.clusterName,
    });
    this.createCfnOutput({
      id: `${prefix}-${stage}-Cluster-Arn`,
      value: cluster.clusterArn,
    });
  }

  /**
   * Create Cloudformation Output
   * @param param0
   */
  private createCfnOutput({ id, value }: { id: string; value: string }) {
    new CfnOutput(this, id, { value });
  }
}

export { EcsStack };
