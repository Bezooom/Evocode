# BPMN XML Reference

## BPMN 2.0 Namespace

```xml
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://example.com/process"
             id="Definitions_1">
```

## BPMN Element Templates

### Start Event

```xml
<startEvent id="start_1" name="Start">
    <outgoing>flow_1</outgoing>
</startEvent>
```

### End Event

```xml
<endEvent id="end_1" name="End">
    <incoming>flow_2</incoming>
</endEvent>
```

### Task (Activity)

```xml
<task id="task_1" name="Activity Name">
    <incoming>flow_1</incoming>
    <outgoing>flow_2</outgoing>
</task>
```

### Exclusive Gateway (XOR)

```xml
<exclusiveGateway id="gateway_1" name="Decision?">
    <incoming>flow_1</incoming>
    <outgoing>flow_2</outgoing>
    <outgoing>flow_3</outgoing>
</exclusiveGateway>
```

### Parallel Gateway (AND)

```xml
<parallelGateway id="gateway_and_1" name="Split/Join">
    <incoming>flow_1</incoming>
    <outgoing>flow_2</outgoing>
    <outgoing>flow_3</outgoing>
    <outgoing>flow_4</outgoing>
</parallelGateway>
```

### Sequence Flow

```xml
<sequenceFlow id="flow_1" name="Yes" sourceRef="gateway_1" targetRef="task_2">
    <conditionExpression xsi:type="tFormalExpression">Yes</conditionExpression>
</sequenceFlow>
```

### Subprocess

```xml
<subProcess id="subprocess_1" name="Subprocess Name">
    <incoming>flow_1</incoming>
    <outgoing>flow_2</outgoing>
    <startEvent id="subprocess_start" name="Start">
        <outgoing>subprocess_flow_1</outgoing>
    </startEvent>
    <task id="subprocess_task" name="Task">
        <incoming>subprocess_flow_1</incoming>
        <outgoing>subprocess_flow_2</outgoing>
    </task>
    <endEvent id="subprocess_end" name="End">
        <incoming>subprocess_flow_2</incoming>
    </endEvent>
</subProcess>
```

### Data Store

```xml
<dataStoreReference id="store_1" name="Database" dataRef="data_1"/>
<dataObject id="data_1" name="Data" />
```

## Complete BPMN Example

```xml
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://example.com/process"
             id="Definitions_1">
    <process id="order_process" name="Order Processing" isExecutable="true">
        <!-- Start Event -->
        <startEvent id="start_1" name="Order In">
            <outgoing>flow_1</outgoing>
        </startEvent>
        <!-- Activity -->
        <task id="task_1" name="Validate Order">
            <incoming>flow_1</incoming>
            <outgoing>flow_2</outgoing>
        </task>
        <!-- Decision -->
        <exclusiveGateway id="gateway_1" name="Fraud Check?">
            <incoming>flow_2</incoming>
            <outgoing>flow_3</outgoing>
            <outgoing>flow_4</outgoing>
        </exclusiveGateway>
        <!-- Yes path -->
        <task id="task_2" name="Manual Review">
            <incoming>flow_3</incoming>
            <outgoing>flow_5</outgoing>
        </task>
        <!-- No path -->
        <task id="task_3" name="Check Stock">
            <incoming>flow_4</incoming>
            <outgoing>flow_6</outgoing>
        </task>
        <!-- End Event -->
        <endEvent id="end_1" name="Order Complete">
            <incoming>flow_5</incoming>
        </endEvent>
        <endEvent id="end_2" name="Out of Stock">
            <incoming>flow_6</incoming>
        </endEvent>
        <!-- Sequence Flows -->
        <sequenceFlow id="flow_1" name="" sourceRef="start_1" targetRef="task_1"/>
        <sequenceFlow id="flow_2" name="" sourceRef="task_1" targetRef="gateway_1"/>
        <sequenceFlow id="flow_3" name="Yes" sourceRef="gateway_1" targetRef="task_2">
            <conditionExpression xsi:type="tFormalExpression">fraud</conditionExpression>
        </sequenceFlow>
        <sequenceFlow id="flow_4" name="No" sourceRef="gateway_1" targetRef="task_3">
            <conditionExpression xsi:type="tFormalExpression">not fraud</conditionExpression>
        </sequenceFlow>
        <sequenceFlow id="flow_5" name="" sourceRef="task_2" targetRef="end_1"/>
        <sequenceFlow id="flow_6" name="" sourceRef="task_3" targetRef="end_2"/>
    </process>
</definitions>
```
