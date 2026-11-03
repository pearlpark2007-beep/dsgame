package com.dsgame.server.api;

import java.util.List;

public record StackRequest(int capacity, List<Operation> operations) {}