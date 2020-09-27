import {
  Construct,
  Stack,
  StackProps,
  CfnOutput,
  Duration,
} from "@aws-cdk/core";
import { Cluster, FargateService } from "@aws-cdk/aws-ecs";
import {
  NetworkLoadBalancer,
  ApplicationProtocol,
  ApplicationLoadBalancer,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Vpc } from "@aws-cdk/aws-ec2";
import { AdjustmentType } from "@aws-cdk/aws-applicationautoscaling";
import { Metric } from "@aws-cdk/aws-cloudwatch";

interface ElbStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  // readonly cluster: Cluster;
  readonly fargateService: FargateService;
  readonly vpc: Vpc;
  // readonly clusterArn: string;
  // readonly clusterName: string;
}

class ElbStack extends Stack {
  constructor(scope: Construct, id: string, props: ElbStackProps) {
    super(scope, id, props);

    /**
     * Get var from props
     */
    const { prefix, stage, vpc, fargateService } = props;

    /**
     * Create Application Load Balancer
     */
    const lb = new NetworkLoadBalancer(this, `${prefix}-${stage}-ALB`, {
      loadBalancerName: `${prefix}-${stage}-ALB`,
      vpc: vpc,
      internetFacing: true,
    });

    const listener = lb.addListener("Listener", {
      port: 80,
    });

    /**
     * Create Target Group
     */
    const targetGroup = listener.addTargets("ECS", {
      targetGroupName: `${prefix}-${stage}-ECS-TG`,
      port: 80,
      targets: [fargateService],
      // deregistrationDelay: Duration.seconds(300), // waiting  mins
      /**
       * include health check (default is none)
       */
      healthCheck: {
        interval: Duration.seconds(30),
        // path: "/",
        // timeout: Duration.seconds(5),
      },
    });

    /**
     * Create Metric
     */
    // const workerRequestCounterMetric = new Metric({
    //   namespace: `${prefix}-${stage}-Worker-Namespace`,
    //   metricName: `${prefix}-${stage}-Request-Counter`,
    //   period: Duration.seconds(60),
    //   statistic: "Maximum",
    //   dimensions: {
    //     LoadBalancer: lb.loadBalancerFullName,
    //     TargetGroup: targetGroup.targetGroupFullName,
    //   },
    // });

    /**
     * Auto Scaling
     */
    const scaling = fargateService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });
    // scaling.scaleOnCpuUtilization("cpu-scaling", {
    //   policyName: `${prefix}-${stage}-cpu-scaling`,
    //   targetUtilizationPercent: 10,
    //   scaleInCooldown: Duration.seconds(60),
    //   scaleOutCooldown: Duration.seconds(60),
    // });
    scaling.scaleOnMetric("metric-scaling", {
      metric: fargateService.metricCpuUtilization(),
      // metric: workerRequestCounterMetric,
      scalingSteps: [
        { upper: 5, change: -1 },
        { lower: 10, change: +1 },
        { lower: 15, change: +2 },
        { lower: 20, change: +3 },
        { lower: 30, change: +4 },
      ],
      // Change this to AdjustmentType.PERCENT_CHANGE_IN_CAPACITY to interpret the
      // 'change' numbers before as percentages instead of capacity counts.
      adjustmentType: AdjustmentType.CHANGE_IN_CAPACITY,
    });

    /**
     * Cfn Ouput
     */
    this.createCfnOutput({
      id: `${prefix}-${stage}-LoadBalancer-DNS-Name`,
      value: lb.loadBalancerDnsName,
    });
    this.createCfnOutput({
      id: `${prefix}-${stage}-LoadBalancer-Arn`,
      value: lb.loadBalancerArn,
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

export { ElbStack };
